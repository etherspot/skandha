import { providers } from "ethers";
import { PerChainMetrics } from "monitoring/lib";
import { Logger } from "types/lib";
import { IEntryPoint__factory } from "types/lib/executor/contracts";
import { Config } from "../../../config";
import { Bundle, NetworkConfig } from "../../../interfaces";
import { MempoolService } from "../../MempoolService";
import { ReputationService } from "../../ReputationService";
import { estimateBundleGasLimit } from "../utils";
import { Relayer } from "../interfaces";
import { now } from "../../../utils";
import { ExecutorEventBus } from "../../SubscriptionService";
import { BaseRelayer } from "./base";

export class EchoRelayer extends BaseRelayer {
  private submitTimeout = 5 * 60 * 1000; // 5 minutes

  constructor(
    logger: Logger,
    chainId: number,
    provider: providers.JsonRpcProvider,
    config: Config,
    networkConfig: NetworkConfig,
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
      const entryPointContract = IEntryPoint__factory.connect(
        entryPoint,
        this.provider
      );

      const txRequest = entryPointContract.interface.encodeFunctionData(
        "handleOps",
        [entries.map((entry) => entry.userOp), beneficiary]
      );

      const transactionRequest: providers.TransactionRequest = {
        to: entryPoint,
        data: txRequest,
        type: 2,
        maxPriorityFeePerGas: bundle.maxPriorityFeePerGas,
        maxFeePerGas: bundle.maxFeePerGas,
        gasLimit: estimateBundleGasLimit(
          this.networkConfig.bundleGasLimitMarkup,
          bundle.entries
        ),
        chainId: this.provider._network.chainId,
        nonce: await relayer.getTransactionCount(),
      };

      if (!(await this.validateBundle(relayer, entries, transactionRequest))) {
        return;
      }

      await this.submitTransaction(relayer, transactionRequest)
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
    transaction: providers.TransactionRequest
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
        const txsSigned = [await signer.signTransaction(transaction)];
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
