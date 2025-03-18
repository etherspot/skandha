import { Mutex } from "async-mutex";
import { BigNumber, constants, providers, utils, Wallet } from "ethers";
import { Logger } from "@skandha/types/lib";
import { PerChainMetrics } from "@skandha/monitoring/lib";
import { MempoolEntryStatus } from "@skandha/types/lib/executor";
import { Chain, createWalletClient, http } from "viem";
import { eip7702Actions, RpcAuthorizationList } from "viem/experimental";
import { privateKeyToAccount } from "viem/accounts";
import { Config } from "../../../config";
import { Bundle, NetworkConfig } from "../../../interfaces";
import { IRelayingMode, Relayer } from "../interfaces";
import { MempoolEntry } from "../../../entities/MempoolEntry";
import { now } from "../../../utils";
import { MempoolService } from "../../MempoolService";
import { ReputationService } from "../../ReputationService";
import { ExecutorEventBus } from "../../SubscriptionService";
import { EntryPointService } from "../../EntryPointService";
import { getViemChainDef } from "../utils/chains";

const WAIT_FOR_TX_MAX_RETRIES = 3; // 3 blocks

export abstract class BaseRelayer implements IRelayingMode {
  protected relayers: Relayer[];
  protected mutexes: Mutex[];
  protected viemChain: Chain;

  constructor(
    protected logger: Logger,
    protected chainId: number,
    protected provider: providers.JsonRpcProvider,
    protected config: Config,
    protected networkConfig: NetworkConfig,
    protected entryPointService: EntryPointService,
    protected mempoolService: MempoolService,
    protected reputationService: ReputationService,
    protected eventBus: ExecutorEventBus,
    protected metrics: PerChainMetrics | null
  ) {
    const relayers = this.config.getRelayers();
    if (!relayers) throw new Error("Relayers are not set");
    this.relayers = [...relayers];
    this.mutexes = this.relayers.map(() => new Mutex());

    this.viemChain = getViemChainDef(chainId);
  }

  isLocked(): boolean {
    return this.mutexes.every((mutex) => mutex.isLocked());
  }

  sendBundle(_bundle: Bundle): Promise<void> {
    throw new Error("Method not implemented.");
  }

  getAvailableRelayersCount(): number {
    return this.mutexes.filter((mutex) => !mutex.isLocked()).length;
  }

  async canSubmitBundle(): Promise<boolean> {
    return true;
  }

  /**
   * waits entries to get submitted
   * @param hashes user op hashes array
   */
  protected async waitForEntries(entries: MempoolEntry[]): Promise<void> {
    let retries = 0;
    if (entries.length == 0) return;
    return new Promise((resolve, reject) => {
      const interval = setInterval(async () => {
        if (retries >= WAIT_FOR_TX_MAX_RETRIES) {
          clearInterval(interval);
          return reject(false);
        }
        retries++;
        for (const entry of entries) {
          const exists = await this.mempoolService.find(entry);
          // if some entry exists in the mempool, it means that the EventService did not delete it yet
          // because that service has not received UserOperationEvent yet
          // so we wait for it to get submitted...
          if (exists && exists.status < MempoolEntryStatus.OnChain) return;
        }
        clearInterval(interval);
        resolve();
      }, this.networkConfig.bundleInterval);
    });
  }

  protected getAvailableRelayerIndex(): number | null {
    const index = this.mutexes.findIndex((mutex) => !mutex.isLocked());
    if (index === -1) {
      return null;
    }
    return index;
  }

  protected async handleUserOpFail(
    entries: MempoolEntry[],
    err: any
  ): Promise<void> {
    if (err.errorName !== "FailedOp") {
      this.logger.error(
        `Failed handleOps, but non-FailedOp error ${JSON.stringify(
          err,
          undefined,
          2
        )}`
      );
      return;
    }
    const { index, paymaster, reason } = err.errorArgs;
    const failedEntry = entries[index];
    if (paymaster !== constants.AddressZero) {
      await this.reputationService.crashedHandleOps(paymaster);
    } else if (typeof reason === "string" && reason.startsWith("AA1")) {
      const factory = failedEntry.factory;
      if (factory) {
        await this.reputationService.crashedHandleOps(factory);
      }
    } else {
      // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
      if (failedEntry) {
        this.logger.debug(`${failedEntry.hash} reverted on chain. Deleting...`);
        await this.mempoolService.updateStatus(
          [failedEntry],
          MempoolEntryStatus.Reverted,
          {
            revertReason: reason,
          }
        );
        this.logger.error(
          `Failed handleOps sender=${failedEntry.userOp.sender}`
        );
      }
    }
  }

  // metrics
  protected reportSubmittedUserops(txHash: string, bundle: Bundle): void {
    if (txHash && this.metrics) {
      this.metrics.bundlesSubmitted.inc(1);
      this.metrics.useropsSubmitted.inc(bundle.entries.length);
      this.metrics.useropsInBundle.observe(bundle.entries.length);
      bundle.entries.forEach((entry) => {
        this.metrics!.useropsTimeToProcess.observe(
          Math.ceil(
            (now() - (entry.submittedTime ?? entry.lastUpdatedTime)) / 1000
          )
        );
      });
    }
  }

  protected reportFailedBundle(): void {
    if (this.metrics) {
      this.metrics.bundlesFailed.inc(1);
    }
  }

  /**
   * determine who should receive the proceedings of the request.
   * if signer's balance is too low, send it to signer. otherwise, send to configured beneficiary.
   */
  protected async selectBeneficiary(relayer: Relayer): Promise<string> {
    const config = this.config.getNetworkConfig();
    let beneficiary = this.config.getBeneficiary();
    if (!beneficiary || !utils.isAddress(beneficiary)) {
      return relayer.getAddress();
    }

    const signerAddress = await relayer.getAddress();
    const currentBalance = await this.provider.getBalance(signerAddress);

    if (currentBalance.lte(config.minSignerBalance) || !beneficiary) {
      beneficiary = signerAddress;
      this.logger.info(
        `low balance on ${signerAddress}. using it as beneficiary`
      );
    }
    return beneficiary;
  }

  /**
   * calls eth_estimateGas with whole bundle
   */
  protected async validateBundle(
    relayer: Relayer,
    entries: MempoolEntry[],
    transactionRequest: providers.TransactionRequest,
    authorizationList: RpcAuthorizationList = []
  ): Promise<boolean> {
    if (this.networkConfig.skipBundleValidation) return true;
    try {
      if (authorizationList.length > 0) {
        const wallet = createWalletClient({
          transport: http(this.config.config.rpcEndpoint),
          account: privateKeyToAccount(
            (relayer as Wallet).privateKey as `0x${string}`
          ),
        }).extend(eip7702Actions());

        await wallet.request({
          method: "eth_estimateGas",
          params: [
            {
              to: transactionRequest.to as `0x${string}`,
              data: transactionRequest.data as `0x${string}`,
              maxFeePerGas:
                transactionRequest.maxFeePerGas != undefined
                  ? (BigNumber.from(transactionRequest.maxFeePerGas)
                      .toHexString()
                      .replace(/^0x0+/, "0x") as `0x${string}`)
                  : undefined,
              maxPriorityFeePerGas:
                transactionRequest.maxPriorityFeePerGas != undefined
                  ? (BigNumber.from(transactionRequest.maxPriorityFeePerGas)
                      .toHexString()
                      .replace(/^0x0+/, "0x") as `0x${string}`)
                  : undefined,
              authorizationList,
            },
          ],
        });
        return true;
      }
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { gasLimit: _, ...txWithoutGasLimit } = transactionRequest;
      // some chains, like Bifrost, don't allow setting gasLimit in estimateGas
      await relayer.estimateGas(txWithoutGasLimit);
      return true;
    } catch (err) {
      this.logger.debug(
        `${entries
          .map((entry) => entry.userOpHash)
          .join("; ")} failed on chain estimation. deleting...`
      );
      this.logger.error(err);
      await this.setCancelled(entries, "could not estimate bundle");
      this.reportFailedBundle();
      return false;
    }
  }

  protected async setSubmitted(
    entries: MempoolEntry[],
    transaction: string
  ): Promise<void> {
    await this.mempoolService.updateStatus(
      entries,
      MempoolEntryStatus.Submitted,
      {
        transaction,
      }
    );
  }

  protected async setCancelled(
    entries: MempoolEntry[],
    reason: string
  ): Promise<void> {
    await this.mempoolService.updateStatus(
      entries,
      MempoolEntryStatus.Cancelled,
      { revertReason: reason }
    );
  }

  protected async setReverted(
    entries: MempoolEntry[],
    reason: string
  ): Promise<void> {
    await this.mempoolService.updateStatus(
      entries,
      MempoolEntryStatus.Reverted,
      {
        revertReason: reason,
      }
    );
  }

  protected async setNew(entries: MempoolEntry[]): Promise<void> {
    await this.mempoolService.updateStatus(entries, MempoolEntryStatus.New);
  }
}
