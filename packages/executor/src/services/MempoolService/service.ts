import { Mutex } from "async-mutex";
import { IDbController, Logger } from "types/lib";
import { MempoolEntryStatus } from "types/lib/executor";
import RpcError from "types/lib/api/errors/rpc-error";
import * as RpcErrorCodes from "types/lib/api/errors/rpc-error-codes";
import { UserOperationStruct } from "types/lib/executor/contracts/EntryPoint";
import { BigNumberish } from "ethers";
import { ReputationService } from "../ReputationService";
import { ExecutorEvent, ExecutorEventBus } from "../SubscriptionService";
import { NetworkConfig, StakeInfo } from "../../interfaces";
import {
  IMempoolEntry,
  MempoolEntrySerialized,
} from "../../entities/interfaces";
import { MempoolEntry } from "../../entities/MempoolEntry";
import { getAddr, now } from "../../utils";
import { rawEntryToMempoolEntry } from "./utils";
import { MempoolReputationChecks } from "./reputation";
import { ARCHIVE_PURGE_INTERVAL } from "./constants";

export class MempoolService {
  private USEROP_COLLECTION_KEY: string;
  private USEROP_HASHES_COLLECTION_PREFIX: string;
  private mutex = new Mutex();
  private reputationCheck: MempoolReputationChecks;

  constructor(
    private db: IDbController,
    private chainId: number,
    private reputationService: ReputationService,
    private eventBus: ExecutorEventBus,
    private networkConfig: NetworkConfig,
    private logger: Logger
  ) {
    this.USEROP_COLLECTION_KEY = `${chainId}:USEROPKEYS`;
    this.USEROP_HASHES_COLLECTION_PREFIX = "USEROPHASH:";
    this.reputationCheck = new MempoolReputationChecks(
      this,
      this.reputationService,
      this.networkConfig
    );

    setInterval(() => {
      void this.deleteOldUserOps();
    }, ARCHIVE_PURGE_INTERVAL); // 5 minutes
  }

  /**
   * View functions
   */

  async dump(): Promise<MempoolEntrySerialized[]> {
    return (await this.fetchPendingUserOps()).map((entry) => entry.serialize());
  }

  async fetchPendingUserOps(): Promise<MempoolEntry[]> {
    return (await this.fetchAll()).filter(
      (entry) => entry.status < MempoolEntryStatus.OnChain
    );
  }

  async fetchManyByKeys(keys: string[]): Promise<MempoolEntry[]> {
    const rawEntries = await this.db
      .getMany<MempoolEntry>(keys)
      .catch(() => []);
    return rawEntries.map(rawEntryToMempoolEntry);
  }

  async find(entry: MempoolEntry): Promise<MempoolEntry | null> {
    return this.findByKey(this.getKey(entry));
  }

  async getEntryByHash(hash: string): Promise<MempoolEntry | null> {
    const key = await this.db
      .get<string>(`${this.USEROP_HASHES_COLLECTION_PREFIX}${hash}`)
      .catch(() => null);
    if (!key) return null;
    return this.findByKey(key);
  }

  async getNewEntriesSorted(size: number, offset = 0): Promise<MempoolEntry[]> {
    const allEntries = await this.fetchAll();
    return allEntries
      .filter((entry) => entry.status === MempoolEntryStatus.New)
      .sort(MempoolEntry.compareByCost)
      .slice(offset, offset + size);
  }

  async validateUserOpReplaceability(
    userOp: UserOperationStruct,
    entryPoint: string
  ): Promise<boolean> {
    const entry = new MempoolEntry({
      chainId: this.chainId,
      userOp,
      entryPoint,
      prefund: "0",
      userOpHash: "",
    });
    return this.validateReplaceability(entry);
  }

  /**
   * Write functions
   */
  async updateStatus(
    entries: MempoolEntry[],
    status: MempoolEntryStatus,
    params?: {
      transaction?: string;
      revertReason?: string;
    }
  ): Promise<void> {
    for (const entry of entries) {
      entry.setStatus(status, params);
      await this.update(entry);

      // event bus logic
      if (
        [
          MempoolEntryStatus.Cancelled,
          MempoolEntryStatus.Submitted,
          MempoolEntryStatus.Reverted,
        ].findIndex((st) => st === status) > -1
      ) {
        this.eventBus.emit(ExecutorEvent.submittedUserOps, entry);
      }
    }
  }

  async clearState(): Promise<void> {
    await this.mutex.runExclusive(async () => {
      const keys = await this.fetchKeys();
      for (const key of keys) {
        await this.db.del(key);
      }
      await this.db.del(this.USEROP_COLLECTION_KEY);
    });
  }

  async attemptToBundle(entries: MempoolEntry[]): Promise<void> {
    for (const entry of entries) {
      entry.submitAttempts++;
      entry.lastUpdatedTime = now();
      await this.update(entry);
    }
  }

  async addUserOp(
    userOp: UserOperationStruct,
    entryPoint: string,
    prefund: BigNumberish,
    senderInfo: StakeInfo,
    factoryInfo: StakeInfo | undefined,
    paymasterInfo: StakeInfo | undefined,
    aggregatorInfo: StakeInfo | undefined,
    userOpHash: string,
    hash?: string,
    aggregator?: string
  ): Promise<void> {
    const entry = new MempoolEntry({
      chainId: this.chainId,
      userOp,
      entryPoint,
      prefund,
      aggregator,
      hash,
      userOpHash,
      factory: getAddr(userOp.initCode),
      paymaster: getAddr(userOp.paymasterAndData),
      submittedTime: now(),
    });
    await this.mutex.runExclusive(async () => {
      const existingEntry = await this.find(entry);
      if (existingEntry) {
        await this.validateReplaceability(entry, existingEntry);
        await this.db.put(this.getKey(entry), {
          ...entry,
          lastUpdatedTime: now(),
        });
        await this.removeUserOpHash(existingEntry.userOpHash);
        await this.saveUserOpHash(entry.userOpHash, entry);
        this.logger.debug("Mempool: User op replaced");
      } else {
        await this.reputationCheck.checkEntityCountInMempool(
          entry,
          senderInfo,
          factoryInfo,
          paymasterInfo,
          aggregatorInfo
        );
        await this.reputationCheck.checkMultipleRolesViolation(entry);
        const userOpKeys = await this.fetchKeys();
        const key = this.getKey(entry);
        userOpKeys.push(key);
        await this.db.put(this.USEROP_COLLECTION_KEY, userOpKeys);
        await this.db.put(key, { ...entry, lastUpdatedTime: now() });
        await this.saveUserOpHash(entry.userOpHash, entry);
        this.logger.debug("Mempool: User op added");
      }
      await this.reputationCheck.updateSeenStatus(userOp, aggregator);
      this.eventBus.emit(ExecutorEvent.pendingUserOps, entry);
    });
  }

  async deleteOldUserOps(): Promise<void> {
    const removableEntries = (await this.fetchAll()).filter((entry) => {
      if (entry.status < MempoolEntryStatus.OnChain) return false;
      if (
        entry.lastUpdatedTime + this.networkConfig.archiveDuration * 1000 >
        now()
      ) {
        return false;
      }
      return true;
    });
    for (const entry of removableEntries) {
      await this.remove(entry);
    }
  }

  /**
   * Internal
   */

  private getKey(entry: Pick<IMempoolEntry, "userOp" | "chainId">): string {
    const { userOp, chainId } = entry;
    return `${chainId}:${userOp.sender.toLowerCase()}:${userOp.nonce}`;
  }

  private async fetchAll(): Promise<MempoolEntry[]> {
    const keys = await this.fetchKeys();
    const rawEntries = await this.db
      .getMany<MempoolEntry>(keys)
      .catch(() => []);
    return rawEntries.map(rawEntryToMempoolEntry);
  }

  private async fetchKeys(): Promise<string[]> {
    const userOpKeys = await this.db
      .get<string[]>(this.USEROP_COLLECTION_KEY)
      .catch(() => []);
    return userOpKeys;
  }

  private async findByKey(key: string): Promise<MempoolEntry | null> {
    const raw = await this.db.get<IMempoolEntry>(key).catch(() => null);
    if (raw) {
      return rawEntryToMempoolEntry(raw);
    }
    return null;
  }

  private async validateReplaceability(
    newEntry: MempoolEntry,
    oldEntry?: MempoolEntry | null
  ): Promise<boolean> {
    if (!oldEntry) {
      oldEntry = await this.find(newEntry);
    }
    if (
      !oldEntry ||
      newEntry.canReplaceWithTTL(oldEntry, this.networkConfig.useropsTTL)
    ) {
      return true;
    }
    throw new RpcError(
      "User op cannot be replaced: fee too low",
      RpcErrorCodes.INVALID_USEROP
    );
  }

  private async update(entry: MempoolEntry): Promise<void> {
    await this.mutex.runExclusive(async () => {
      await this.db.put(this.getKey(entry), entry);
    });
  }

  private async remove(entry: MempoolEntry | null): Promise<void> {
    if (!entry) {
      return;
    }
    await this.mutex.runExclusive(async () => {
      const key = this.getKey(entry);
      const newKeys = (await this.fetchKeys()).filter((k) => k !== key);
      await this.db.del(key);
      await this.db.put(this.USEROP_COLLECTION_KEY, newKeys);
      this.logger.debug(`${entry.userOpHash} deleted from mempool`);
    });
  }

  private async saveUserOpHash(
    hash: string,
    entry: MempoolEntry
  ): Promise<void> {
    const key = this.getKey(entry);
    await this.db.put(`${this.USEROP_HASHES_COLLECTION_PREFIX}${hash}`, key);
  }

  private async removeUserOpHash(hash: string): Promise<void> {
    await this.db.del(`${this.USEROP_HASHES_COLLECTION_PREFIX}${hash}`);
  }
}
