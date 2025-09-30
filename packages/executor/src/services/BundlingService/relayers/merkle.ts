/* eslint-disable @typescript-eslint/no-explicit-any */
import path from "node:path";
import { PerChainMetrics } from "@skandha/monitoring/lib/index.js";
import { Logger } from "@skandha/types/lib/index.js";
import { fetchJson } from "ethers/lib/utils";
import {
  createPublicClient,
  Hex,
  http,
  PublicClient,
  TransactionRequest,
} from "viem";
import { Config } from "../../../config.js";
import { Bundle, NetworkConfig } from "../../../interfaces.js";
import { MempoolService } from "../../MempoolService/index.js";
import { ReputationService } from "../../ReputationService.js";
import { estimateBundleGasLimit } from "../utils/index.js";
import { now } from "../../../utils/index.js";
import { ExecutorEventBus } from "../../SubscriptionService.js";
import { EntryPointService } from "../../EntryPointService/index.js";
import { BaseRelayer } from "./base.js";

export class MerkleRelayer extends BaseRelayer {
  private submitTimeout = 2 * 60 * 1000; // 2 minutes

  constructor(
    logger: Logger,
    chainId: number,
    publicClient: PublicClient,
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
      publicClient,
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

      const transactionRequest: TransactionRequest = {
        to: entryPoint as Hex,
        data: txRequest,
        // type: 2,
        // maxPriorityFeePerGas: bundle.maxPriorityFeePerGas,
        // maxFeePerGas: bundle.maxFeePerGas,
        gas: estimateBundleGasLimit(
          this.networkConfig.bundleGasLimitMarkup,
          bundle.entries,
          this.networkConfig.estimationGasLimit
        ),
        nonce: await this.publicClient.getTransactionCount({
          // eslint-disable-next-line @typescript-eslint/no-non-null-asserted-optional-chain
          address: relayer.account?.address!,
        }),
      };

      if (this.networkConfig.eip2930) {
        const { storageMap } = bundle;
        const addresses = Object.keys(storageMap) as Hex[];
        if (addresses.length) {
          const accessList = [];
          for (const address of addresses) {
            const storageKeys = storageMap[address];
            if (typeof storageKeys == "object") {
              accessList.push({
                address: address as Hex,
                storageKeys: Object.keys(storageKeys) as Hex[],
              });
            }
          }
          transactionRequest.accessList = accessList;
        }
      }

      if (!(await this.validateBundle(relayer, entries, transactionRequest))) {
        return;
      }

      this.logger.debug(transactionRequest, "Merkle: Submitting");
      // const merkleProvider = new providers.JsonRpcProvider(
      //   this.networkConfig.rpcEndpointSubmit
      // );
      const merkleClient = createPublicClient({
        transport: http(this.networkConfig.rpcEndpointSubmit),
      });
      const signedRawTx = await relayer.signTransaction({
        ...(transactionRequest as any),
      });
      const params = !this.networkConfig.conditionalTransactions
        ? [signedRawTx]
        : [signedRawTx, { knownAccounts: storageMap }];
      try {
        const hash = await merkleClient.request({
          method: "eth_sendRawTransaction",
          params: params as any,
        });
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

  async waitForTransaction(hash: Hex): Promise<boolean> {
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
              const response = await this.publicClient.getTransaction({ hash });
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
