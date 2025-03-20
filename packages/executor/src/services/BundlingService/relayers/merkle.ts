import path from "node:path";
import { BigNumber, providers, Wallet } from "ethers";
import { PerChainMetrics } from "@skandha/monitoring/lib";
import { Logger } from "@skandha/types/lib";
import { AccessList, fetchJson } from "ethers/lib/utils";
import { AuthorizationList, eip7702Actions } from "viem/experimental";
import { createWalletClient, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { Config } from "../../../config";
import { Bundle, NetworkConfig } from "../../../interfaces";
import { MempoolService } from "../../MempoolService";
import { ReputationService } from "../../ReputationService";
import { estimateBundleGasLimit } from "../utils";
import { now } from "../../../utils";
import { ExecutorEventBus } from "../../SubscriptionService";
import { EntryPointService } from "../../EntryPointService";
import { getAuthorizationList } from "../utils/eip7702";
import { Relayer } from "../interfaces";
import { BaseRelayer } from "./base";

export class MerkleRelayer extends BaseRelayer {
  private submitTimeout = 2 * 60 * 1000; // 2 minutes

  constructor(
    logger: Logger,
    chainId: number,
    provider: providers.JsonRpcProvider,
    config: Config,
    networkConfig: NetworkConfig,
    entryPointService: EntryPointService,
    mempoolService: MempoolService,
    reputationService: ReputationService,
    eventBus: ExecutorEventBus,
    metrics: PerChainMetrics | null
  ) {
    super(
      logger,
      chainId,
      provider,
      config,
      networkConfig,
      entryPointService,
      mempoolService,
      reputationService,
      eventBus,
      metrics
    );
    if (
      !this.networkConfig.rpcEndpointSubmit ||
      !this.networkConfig.merkleApiURL
    ) {
      throw Error(
        "If you want to use Merkle API, please set RPC url in 'rpcEndpointSubmit' and API url in `merkleApiURL` in config file"
      );
    }
  }

  async sendBundle(bundle: Bundle): Promise<void> {
    const availableIndex = this.getAvailableRelayerIndex();
    if (availableIndex == null) return;

    const relayer = this.relayers[availableIndex];
    const mutex = this.mutexes[availableIndex];

    const { entries, storageMap } = bundle;
    if (!bundle.entries.length) return;

    await mutex.runExclusive(async () => {
      const beneficiary = await this.selectBeneficiary(relayer);
      const entryPoint = entries[0]!.entryPoint;
      const txRequest = this.entryPointService.encodeHandleOps(
        entryPoint,
        entries.map((entry) => entry.userOp),
        beneficiary
      );

      const transactionRequest: providers.TransactionRequest = {
        to: entryPoint,
        data: txRequest,
        type: 2,
        maxPriorityFeePerGas: bundle.maxPriorityFeePerGas,
        maxFeePerGas: bundle.maxFeePerGas,
        gasLimit: estimateBundleGasLimit(
          this.networkConfig.bundleGasLimitMarkup,
          bundle.entries,
          this.networkConfig.estimationGasLimit
        ),
        chainId: this.provider._network.chainId,
        nonce: await relayer.getTransactionCount(),
      };

      if (this.networkConfig.eip2930) {
        const { storageMap } = bundle;
        const addresses = Object.keys(storageMap);
        if (addresses.length) {
          const accessList: AccessList = [];
          for (const address of addresses) {
            const storageKeys = storageMap[address];
            if (typeof storageKeys == "object") {
              accessList.push({
                address,
                storageKeys: Object.keys(storageKeys),
              });
            }
          }
          transactionRequest.accessList = accessList;
        }
      }

      const { authorizationList, rpcAuthorizationList } =
        getAuthorizationList(bundle);

      if (
        !(await this.validateBundle(
          relayer,
          entries,
          transactionRequest,
          rpcAuthorizationList
        ))
      ) {
        return;
      }

      if (
        !(await this.validateBundle(
          relayer,
          entries,
          transactionRequest,
          rpcAuthorizationList
        ))
      ) {
        return;
      }

      this.logger.debug(transactionRequest, "Merkle: Submitting");
      const merkleProvider = new providers.JsonRpcProvider(
        this.networkConfig.rpcEndpointSubmit
      );
      let signedRawTx: string;
      if (authorizationList.length <= 0) {
        signedRawTx = await relayer.signTransaction(transactionRequest);
      } else {
        signedRawTx = await this.signEip7702Tx(
          relayer,
          transactionRequest,
          authorizationList
        );
      }
      const params = !this.networkConfig.conditionalTransactions
        ? [signedRawTx]
        : [signedRawTx, { knownAccounts: storageMap }];
      try {
        const hash = await merkleProvider.send(
          "eth_sendRawTransaction",
          params
        );
        this.logger.debug(`Bundle submitted: ${hash}`);
        this.logger.debug(
          `User op hashes ${entries.map((entry) => entry.userOpHash)}`
        );
        await this.setSubmitted(entries, hash);
        await this.waitForTransaction(hash);
      } catch (err) {
        this.reportFailedBundle();
        await this.setNew(entries);
        await this.handleUserOpFail(entries, err);
      }
    });
  }

  private async signEip7702Tx(
    signer: Relayer,
    transaction: providers.TransactionRequest,
    authorizationList: AuthorizationList
  ): Promise<string> {
    const wallet = createWalletClient({
      transport: http(this.config.config.rpcEndpoint),
      account: privateKeyToAccount(
        (signer as Wallet).privateKey as `0x${string}`
      ),
    }).extend(eip7702Actions());

    const res = await wallet.signTransaction({
      authorizationList,
      to: transaction.to as `0x${string}`,
      gas:
        transaction.gasLimit != undefined
          ? BigNumber.from(transaction.gasLimit).toBigInt()
          : undefined,
      maxFeePerGas:
        transaction.maxFeePerGas != undefined
          ? BigNumber.from(transaction.maxFeePerGas).toBigInt()
          : undefined,
      maxPriorityFeePerGas:
        transaction.maxPriorityFeePerGas != undefined
          ? BigNumber.from(transaction.maxPriorityFeePerGas).toBigInt()
          : undefined,
      data: transaction.data as `0x${string}`,
      nonce:
        transaction.nonce != undefined
          ? BigNumber.from(transaction.nonce).toNumber()
          : undefined,
      type: "eip7702",
      chain: this.viemChain,
    });
    return res;
  }

  async waitForTransaction(hash: string): Promise<boolean> {
    const txStatusUrl = new URL(
      path.join("transaction", hash),
      this.networkConfig.merkleApiURL
    ).toString();
    const submitStart = now();
    return new Promise<boolean>((resolve, reject) => {
      let lock = false;
      const handler = async (): Promise<void> => {
        this.logger.debug("Merkle: Fetching tx status");
        if (now() - submitStart > this.submitTimeout) return reject("timeout");
        if (lock) return;
        lock = true;
        try {
          // https://docs.merkle.io/private-pool/wallets/transaction-status
          const status = await fetchJson(txStatusUrl);
          this.logger.debug(status, `Merkle: ${hash}`);
          switch (status.status) {
            case "nonce_too_low":
            case "not_enough_funds":
            case "base_fee_low":
            case "low_priority_fee":
            case "not_enough_gas":
            case "sanctioned":
            case "gas_limit_too_high":
            case "invalid_signature":
            case "nonce_gapped":
              reject("rebundle"); // the bundle can be submitted again, no need to delete userops
              break;
            default: {
              const response = await this.provider.getTransaction(hash);
              if (response == null) {
                this.logger.debug(
                  "Transaction not found yet. Trying again in 2 seconds"
                );
                setTimeout(() => handler(), 2000); // fetch status again in 2 seconds
                lock = false;
                return;
              }
              this.logger.debug("Transaction is found");
              resolve(true); // transaction is found
            }
          }
        } catch (err: any) {
          this.logger.debug(err, "Could not fetch transaction status");
          // transaction is not found, but not necessarily failed
          if (err.status === 400) {
            setTimeout(() => handler(), 2000); // fetch status again in 2 seconds
            lock = false;
            return;
          }
          reject(err);
        }
      };
      void handler();
    });
  }
}
