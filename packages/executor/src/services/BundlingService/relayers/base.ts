import { Mutex } from "async-mutex";
import { constants, providers } from "ethers";
import { Logger, NetworkName } from "types/lib";
import { PerChainMetrics } from "monitoring/lib";
import { Config } from "../../../config";
import { Bundle, NetworkConfig } from "../../../interfaces";
import { IRelayingMode, Relayer } from "../interfaces";
import { MempoolEntry } from "../../../entities/MempoolEntry";
import { getAddr } from "../../../utils";
import { MempoolService } from "../../MempoolService";
import { ReputationService } from "../../ReputationService";

const WAIT_FOR_TX_MAX_RETRIES = 30; // 30 seconds

export abstract class BaseRelayer implements IRelayingMode {
  protected relayers: Relayer[];
  protected mutexes: Mutex[];

  constructor(
    protected logger: Logger,
    protected chainId: number,
    protected network: NetworkName,
    protected provider: providers.JsonRpcProvider,
    protected config: Config,
    protected networkConfig: NetworkConfig,
    protected mempoolService: MempoolService,
    protected reputationService: ReputationService,
    protected metrics: PerChainMetrics | null
  ) {
    const relayer = this.config.getRelayer(this.network);
    if (!relayer) throw new Error("Relayer is not set");
    this.relayers = [relayer];
    this.mutexes = this.relayers.map(() => new Mutex());
  }

  isLocked(): boolean {
    return this.mutexes.every((mutex) => mutex.isLocked());
  }

  sendBundle(_bundle: Bundle, _beneficiary: string): Promise<void> {
    throw new Error("Method not implemented.");
  }

  /**
   * waits for transaction
   * @param hash transaction hash
   * @returns false if transaction reverted
   */
  protected async waitForTransaction(hash: string): Promise<boolean> {
    let retries = 0;
    return new Promise((resolve, reject) => {
      const interval = setInterval(async () => {
        if (retries >= WAIT_FOR_TX_MAX_RETRIES) reject(false);
        retries++;
        const response = await this.provider.getTransaction(hash);
        if (response != null) {
          clearInterval(interval);
          try {
            await response.wait();
            resolve(true);
          } catch (err) {
            reject(err);
          }
        }
      }, 1000);
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
      this.logger.error(`Failed handleOps, but non-FailedOp error ${err}`);
      return;
    }
    const { index, paymaster, reason } = err.errorArgs;
    const entry = entries[index];
    if (paymaster !== constants.AddressZero) {
      await this.reputationService.crashedHandleOps(paymaster);
    } else if (typeof reason === "string" && reason.startsWith("AA1")) {
      const factory = getAddr(entry?.userOp.initCode);
      if (factory) {
        await this.reputationService.crashedHandleOps(factory);
      }
    } else {
      // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
      if (entry) {
        await this.mempoolService.remove(entry);
        this.logger.error(`Failed handleOps sender=${entry.userOp.sender}`);
      }
    }
  }
}
