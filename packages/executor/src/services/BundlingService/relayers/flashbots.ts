import { providers } from "ethers";
import { PerChainMetrics } from "monitoring/lib";
import { Logger, NetworkName } from "types/lib";
import { IEntryPoint__factory } from "types/lib/executor/contracts";
import {
  FlashbotsBundleProvider,
  FlashbotsBundleResolution,
} from "@flashbots/ethers-provider-bundle";
import { MempoolEntryStatus } from "types/lib/executor";
import { Config } from "../../../config";
import { Bundle, NetworkConfig } from "../../../interfaces";
import { MempoolService } from "../../MempoolService";
import { ReputationService } from "../../ReputationService";
import { estimateBundleGasLimit } from "../utils";
import { Relayer } from "../interfaces";
import { now } from "../../../utils";
import { BaseRelayer } from "./base";

export class FlashbotsRelayer extends BaseRelayer {
  constructor(
    logger: Logger,
    chainId: number,
    network: NetworkName,
    provider: providers.JsonRpcProvider,
    config: Config,
    networkConfig: NetworkConfig,
    mempoolService: MempoolService,
    reputationService: ReputationService,
    metrics: PerChainMetrics | null
  ) {
    super(
      logger,
      chainId,
      network,
      provider,
      config,
      networkConfig,
      mempoolService,
      reputationService,
      metrics
    );
  }

  async sendBundle(bundle: Bundle, beneficiary: string): Promise<void> {
    const availableIndex = this.getAvailableRelayerIndex();
    if (availableIndex == null) return;

    const relayer = this.relayers[availableIndex];
    const mutex = this.mutexes[availableIndex];

    const { entries } = bundle;
    if (!bundle.entries.length) return;

    await mutex.runExclusive(async (): Promise<void> => {
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

      let txHash = "";

      try {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { gasLimit, ...txWithoutGasLimit } = transactionRequest;
        // some chains, like Bifrost, don't allow setting gasLimit in estimateGas
        await relayer.estimateGas(txWithoutGasLimit);
      } catch (err) {
        this.logger.error(err);
        for (const entry of entries) {
          await this.mempoolService.remove(entry);
        }
        return;
      }

      try {
        txHash = await this.submitTransaction(relayer, transactionRequest);
      } catch (err) {
        await this.handleUserOpFail(entries, err);
      }

      if (txHash) {
        this.logger.debug(`Bundle submitted: ${txHash}`);
        this.logger.debug(
          `User op hashes ${entries.map((entry) => entry.userOpHash)}`
        );
        await this.mempoolService.setStatus(
          entries,
          MempoolEntryStatus.Submitted,
          txHash
        );

        await this.waitForTransaction(txHash);
      }

      await this.mempoolService.removeAll(entries);
      // metrics
      if (txHash && this.metrics) {
        this.metrics.useropsSubmitted.inc(bundle.entries.length);
        bundle.entries.forEach((entry) => {
          this.metrics!.useropsTimeToProcess.observe(
            now() - entry.lastUpdatedTime
          );
        });
      }
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
    this.logger.debug(transaction, "Submitting via flashbots");
    const fbProvider = await FlashbotsBundleProvider.create(
      this.provider,
      signer,
      this.networkConfig.rpcEndpointSubmit,
      this.network
    );
    return new Promise((resolve, reject) => {
      let lock = false;
      const handler = async (blockNumber: number): Promise<void> => {
        if (lock) return;
        lock = true;
        const targetBlock = blockNumber + 1;
        const signedBundle = await fbProvider.signBundle([
          { signer, transaction },
        ]);
        const bundleReceipt = await fbProvider.sendRawBundle(
          signedBundle,
          targetBlock
        );
        if ("error" in bundleReceipt) {
          this.provider.removeListener("block", handler);
          return reject(bundleReceipt.error);
        }
        const waitResponse = await bundleReceipt.wait();
        lock = false;
        if (FlashbotsBundleResolution[waitResponse] === "BundleIncluded") {
          this.provider.removeListener("block", handler);
          resolve(bundleReceipt.bundleHash);
        }
        if (FlashbotsBundleResolution[waitResponse] === "AccountNonceTooHigh") {
          this.provider.removeListener("block", handler);
          return reject("AccountNonceTooHigh");
        }
      };
      this.provider.on("block", handler);
    });
  }
}
