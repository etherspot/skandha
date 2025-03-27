import { BigNumber, providers, Wallet } from "ethers";
import { PerChainMetrics } from "@skandha/monitoring/lib";
import { Logger } from "@skandha/types/lib";
import { privateKeyToAccount } from "viem/accounts";
import { createWalletClient, http } from "viem";
import { AuthorizationList, eip7702Actions } from "viem/experimental";
import { Config } from "../../../config";
import { Bundle, NetworkConfig } from "../../../interfaces";
import { MempoolService } from "../../MempoolService";
import { ReputationService } from "../../ReputationService";
import { estimateBundleGasLimit } from "../utils";
import { Relayer } from "../interfaces";
import { now } from "../../../utils";
import { ExecutorEventBus } from "../../SubscriptionService";
import { EntryPointService } from "../../EntryPointService";
import { getAuthorizationList } from "../utils/eip7702";
import { BaseRelayer } from "./base";

export class EchoRelayer extends BaseRelayer {
  private submitTimeout = 5 * 60 * 1000; // 5 minutes

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
    if (this.networkConfig.echoAuthKey.length === 0) {
      throw new Error("Echo API key is missing");
    }
  }

  async sendBundle(bundle: Bundle): Promise<void> {
    const availableIndex = this.getAvailableRelayerIndex();
    if (availableIndex == null) return;

    const relayer = this.relayers[availableIndex];
    const mutex = this.mutexes[availableIndex];

    const { entries } = bundle;
    if (!bundle.entries.length) return;

    await mutex.runExclusive(async (): Promise<void> => {
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

      await this.submitTransaction(
        relayer,
        transactionRequest,
        authorizationList
      )
        .then(async (txHash) => {
          this.logger.debug(`Echo: Bundle submitted: ${txHash}`);
          this.logger.debug(
            `Echo: User op hashes ${entries.map((entry) => entry.userOpHash)}`
          );
          await this.setSubmitted(entries, txHash);
          await this.waitForEntries(entries).catch((err) =>
            this.logger.error(err, "Echo: Could not find transaction")
          );
          this.reportSubmittedUserops(txHash, bundle);
        })
        .catch(async (err: any) => {
          this.reportFailedBundle();
          // Put all userops back to the mempool
          // if some userop failed, it will be deleted inside handleUserOpFail()
          await this.setNew(entries);
          if (err === "timeout") {
            this.logger.debug("Echo: Timeout");
            return;
          }
          await this.handleUserOpFail(entries, err);
          return;
        });
    });
  }

  /**
   * signs & sends a transaction
   * @param signer wallet
   * @param transaction transaction request
   * @param storageMap storage map
   * @returns transaction hash
   */
  private async submitTransaction(
    signer: Relayer,
    transaction: providers.TransactionRequest,
    authorizationList: AuthorizationList
  ): Promise<string> {
    this.logger.debug(transaction, "Echo: Submitting");
    const echoProvider = new providers.JsonRpcProvider({
      url: this.networkConfig.rpcEndpointSubmit,
      headers: {
        "x-api-key": this.networkConfig.echoAuthKey,
      },
    });

    const submitStart = now();
    return new Promise((resolve, reject) => {
      let lock = false;
      const handler = async (blockNumber: number): Promise<void> => {
        if (now() - submitStart > this.submitTimeout) return reject("timeout");
        if (lock) return;
        lock = true;
        const targetBlock = blockNumber + 1;
        let txsSigned: string[];
        if (authorizationList.length <= 0) {
          txsSigned = [await signer.signTransaction(transaction)];
        } else {
          txsSigned = [
            await this.signEip7702Tx(signer, transaction, authorizationList),
          ];
        }
        this.logger.debug(`Echo: Trying to submit to block ${targetBlock}`);
        try {
          const bundleReceipt: EchoSuccessfulResponse = await echoProvider.send(
            "eth_sendBundle",
            [
              {
                txs: txsSigned,
                blockNumber: targetBlock,
                awaitReceipt: true,
                usePublicMempool: false,
              },
            ]
          );
          this.logger.debug(bundleReceipt, "Echo: received receipt");
          lock = false;
          if (
            bundleReceipt == null ||
            bundleReceipt.receiptNotification == null
          ) {
            return; // try again
          }
          if (bundleReceipt.receiptNotification.status === "included") {
            this.provider.removeListener("block", handler);
            resolve(bundleReceipt.bundleHash);
          }
          if (bundleReceipt.receiptNotification.status === "timedOut") {
            return; // try again
          }
        } catch (err) {
          this.logger.error(err, "Echo: received error");
          this.provider.removeListener("block", handler);
          return reject(err);
        }
      };
      this.provider.on("block", handler);
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
}

type EchoSuccessfulResponse = {
  bundleHash: string;
  receiptNotification: {
    status: "included" | "timedOut";
    data: {
      blockNumber: number;
      elapsedMs: number;
    };
  };
};
