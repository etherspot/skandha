import { BigNumberish, utils } from "ethers";
import { IDbController } from "types/lib";
import RpcError from "types/lib/api/errors/rpc-error";
import * as RpcErrorCodes from "types/lib/api/errors/rpc-error-codes";
import { UserOperationStruct } from "types/lib/executor/contracts/EntryPoint";
import {
  IEntityWithAggregator,
  MempoolEntryStatus,
  ReputationStatus,
} from "types/lib/executor";
import { getAddr, now } from "../utils";
import { MempoolEntry } from "../entities/MempoolEntry";
import { IMempoolEntry, MempoolEntrySerialized } from "../entities/interfaces";
import { KnownEntities, NetworkConfig, StakeInfo } from "../interfaces";
import { ReputationService } from "./ReputationService";

export class MempoolService {
  private MAX_MEMPOOL_USEROPS_PER_SENDER = 4;
  private THROTTLED_ENTITY_MEMPOOL_COUNT = 4;
  private USEROP_COLLECTION_KEY: string;
  private USEROP_HASHES_COLLECTION_PREFIX: string; // stores userop all hashes, independent of a chain

  constructor(
    private db: IDbController,
    private chainId: number,
    private reputationService: ReputationService,
    private networkConfig: NetworkConfig
  ) {
    this.USEROP_COLLECTION_KEY = `${chainId}:USEROPKEYS`;
    this.USEROP_HASHES_COLLECTION_PREFIX = "USEROPHASH:";
  }

  async count(): Promise<number> {
    const userOpKeys: string[] = await this.fetchKeys();
    return userOpKeys.length;
  }

  async dump(): Promise<MempoolEntrySerialized[]> {
    return (await this.fetchAll()).map((entry) => entry.serialize());
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
    });
    const existingEntry = await this.find(entry);
    if (existingEntry) {
      await this.validateReplaceability(entry, existingEntry);
      await this.db.put(this.getKey(entry), {
        ...entry,
        lastUpdatedTime: now(),
      });
      await this.removeUserOpHash(existingEntry.userOpHash);
      await this.saveUserOpHash(entry.userOpHash, entry);
    } else {
      await this.checkEntityCountInMempool(
        entry,
        senderInfo,
        factoryInfo,
        paymasterInfo,
        aggregatorInfo
      );
      await this.checkMultipleRolesViolation(entry);
      const userOpKeys = await this.fetchKeys();
      const key = this.getKey(entry);
      userOpKeys.push(key);
      await this.db.put(this.USEROP_COLLECTION_KEY, userOpKeys);
      await this.db.put(key, { ...entry, lastUpdatedTime: now() });
      await this.saveUserOpHash(entry.userOpHash, entry);
    }
    await this.updateSeenStatus(userOp, aggregator);
  }

  async removeAll(entries: MempoolEntry[]): Promise<void> {
    for (const entry of entries) {
      await this.remove(entry);
    }
  }

  async remove(entry: MempoolEntry | null): Promise<void> {
    if (!entry) {
      return;
    }
    const key = this.getKey(entry);
    const newKeys = (await this.fetchKeys()).filter((k) => k !== key);
    await this.db.del(key);
    await this.db.put(this.USEROP_COLLECTION_KEY, newKeys);
  }

  async setStatus(
    entries: MempoolEntry[],
    status: MempoolEntryStatus,
    txHash?: string
  ): Promise<void> {
    for (const entry of entries) {
      entry.setStatus(status, txHash);
      await this.db.put(this.getKey(entry), {
        ...entry,
        lastUpdatedTime: now(),
      });
    }
  }

  async saveUserOpHash(hash: string, entry: MempoolEntry): Promise<void> {
    const key = this.getKey(entry);
    await this.db.put(`${this.USEROP_HASHES_COLLECTION_PREFIX}${hash}`, key);
  }

  async removeUserOpHash(hash: string): Promise<void> {
    await this.db.del(`${this.USEROP_HASHES_COLLECTION_PREFIX}${hash}`);
  }

  async getEntryByHash(hash: string): Promise<MempoolEntry | null> {
    const key = await this.db
      .get<string>(`${this.USEROP_HASHES_COLLECTION_PREFIX}${hash}`)
      .catch(() => null);
    if (!key) return null;
    return this.findByKey(key);
  }

  async getNewEntriesSorted(): Promise<MempoolEntry[]> {
    const allEntries = await this.fetchAll();
    return allEntries
      .filter((entry) => entry.status === MempoolEntryStatus.New)
      .sort(MempoolEntry.compareByCost);
  }

  async clearState(): Promise<void> {
    const keys = await this.fetchKeys();
    for (const key of keys) {
      await this.db.del(key);
    }
    await this.db.del(this.USEROP_COLLECTION_KEY);
  }

  async find(entry: MempoolEntry): Promise<MempoolEntry | null> {
    return this.findByKey(this.getKey(entry));
  }

  async findByKey(key: string): Promise<MempoolEntry | null> {
    const raw = await this.db.get<IMempoolEntry>(key).catch(() => null);
    if (raw) {
      return this.rawEntryToMempoolEntry(raw);
    }
    return null;
  }

  async validateReplaceability(
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

  getKey(entry: Pick<IMempoolEntry, "userOp" | "chainId">): string {
    const { userOp, chainId } = entry;
    return `${chainId}:${userOp.sender.toLowerCase()}:${userOp.nonce}`;
  }

  async fetchKeys(): Promise<string[]> {
    const userOpKeys = await this.db
      .get<string[]>(this.USEROP_COLLECTION_KEY)
      .catch(() => []);
    return userOpKeys;
  }

  async fetchAll(): Promise<MempoolEntry[]> {
    const keys = await this.fetchKeys();
    const rawEntries = await this.db
      .getMany<MempoolEntry>(keys)
      .catch(() => []);
    return rawEntries.map(this.rawEntryToMempoolEntry);
  }

  async fetchManyByKeys(keys: string[]): Promise<MempoolEntry[]> {
    const rawEntries = await this.db
      .getMany<MempoolEntry>(keys)
      .catch(() => []);
    return rawEntries.map(this.rawEntryToMempoolEntry);
  }

  private async checkEntityCountInMempool(
    entry: MempoolEntry,
    accountInfo: StakeInfo,
    factoryInfo: StakeInfo | undefined,
    paymasterInfo: StakeInfo | undefined,
    aggregatorInfo: StakeInfo | undefined
  ): Promise<void> {
    const mEntries = await this.fetchAll();
    const titles: IEntityWithAggregator[] = [
      "account",
      "factory",
      "paymaster",
      "aggregator",
    ];
    const count = [1, 1, 1, 1]; // starting all values from one because `entry` param counts as well
    const stakes = [accountInfo, factoryInfo, paymasterInfo, aggregatorInfo];
    for (const mEntry of mEntries) {
      if (
        utils.getAddress(mEntry.userOp.sender) ==
        utils.getAddress(accountInfo.addr)
      ) {
        count[0]++;
      }
      // counts the number of similar factories, paymasters and aggregator in the mempool
      for (let i = 1; i < 4; ++i) {
        const mEntity = mEntry[titles[i] as keyof MempoolEntry] as string;
        if (
          stakes[i] &&
          mEntity &&
          utils.getAddress(mEntity) == utils.getAddress(stakes[i]!.addr)
        ) {
          count[i]++;
        }
      }
    }

    // check for ban
    for (const [index, stake] of stakes.entries()) {
      if (!stake) continue;
      const status = await this.reputationService.getStatus(stake.addr);
      if (status === ReputationStatus.BANNED) {
        throw new RpcError(
          `${titles[index]} ${stake.addr} is banned`,
          RpcErrorCodes.PAYMASTER_OR_AGGREGATOR_BANNED
        );
      }
      if (
        status === ReputationStatus.THROTTLED &&
        count[index] > this.THROTTLED_ENTITY_MEMPOOL_COUNT
      ) {
        throw new RpcError(
          `${titles[index]} ${stake.addr} is throttled`,
          RpcErrorCodes.PAYMASTER_OR_AGGREGATOR_BANNED
        );
      }
      const reputationEntry =
        index === 0 ? null : await this.reputationService.fetchOne(stake.addr);
      const maxMempoolCount =
        index === 0
          ? this.MAX_MEMPOOL_USEROPS_PER_SENDER
          : this.reputationService.calculateMaxAllowedMempoolOpsUnstaked(
              reputationEntry!
            );
      if (count[index] > maxMempoolCount) {
        const checkStake = await this.reputationService.checkStake(stake);
        if (checkStake.code !== 0) {
          throw new RpcError(checkStake.msg, checkStake.code);
        }
      }
    }
  }

  private async checkMultipleRolesViolation(
    entry: MempoolEntry
  ): Promise<void> {
    const { userOp } = entry;
    const { otherEntities, accounts } = await this.getKnownEntities();
    if (otherEntities.includes(utils.getAddress(userOp.sender))) {
      throw new RpcError(
        `The sender address "${userOp.sender}" is used as a different entity in another UserOperation currently in mempool`,
        RpcErrorCodes.INVALID_OPCODE
      );
    }

    if (userOp.paymasterAndData.length >= 42) {
      const paymaster = utils.getAddress(getAddr(userOp.paymasterAndData)!);
      if (accounts.includes(paymaster)) {
        throw new RpcError(
          `A Paymaster at ${paymaster} in this UserOperation is used as a sender entity in another UserOperation currently in mempool.`,
          RpcErrorCodes.INVALID_OPCODE
        );
      }
    }

    if (userOp.initCode.length >= 42) {
      const factory = utils.getAddress(getAddr(userOp.initCode)!);
      if (accounts.includes(factory)) {
        throw new RpcError(
          `A Factory at ${factory} in this UserOperation is used as a sender entity in another UserOperation currently in mempool.`,
          RpcErrorCodes.INVALID_OPCODE
        );
      }
    }
  }

  rawEntryToMempoolEntry(raw: IMempoolEntry): MempoolEntry {
    return new MempoolEntry({
      chainId: raw.chainId,
      userOp: raw.userOp,
      entryPoint: raw.entryPoint,
      prefund: raw.prefund,
      aggregator: raw.aggregator,
      factory: raw.factory,
      paymaster: raw.paymaster,
      hash: raw.hash,
      userOpHash: raw.userOpHash,
      lastUpdatedTime: raw.lastUpdatedTime,
      transaction: raw.transaction,
      status: raw.status,
    });
  }

  /**
   * returns a list of addresses of all entities in the mempool
   */
  private async getKnownEntities(): Promise<KnownEntities> {
    const entities: KnownEntities = {
      accounts: [],
      otherEntities: [],
    };
    const entries = await this.fetchAll();
    for (const entry of entries) {
      entities.accounts.push(utils.getAddress(entry.userOp.sender));
      if (entry.paymaster && entry.paymaster.length >= 42) {
        entities.otherEntities.push(
          utils.getAddress(getAddr(entry.paymaster)!)
        );
      }
      if (entry.factory && entry.factory.length >= 42) {
        entities.otherEntities.push(utils.getAddress(getAddr(entry.factory)!));
      }
    }
    return entities;
  }

  private async updateSeenStatus(
    userOp: UserOperationStruct,
    aggregator?: string
  ): Promise<void> {
    const paymaster = getAddr(userOp.paymasterAndData);
    const factory = getAddr(userOp.initCode);
    await this.reputationService.updateSeenStatus(userOp.sender);
    if (aggregator) {
      await this.reputationService.updateSeenStatus(aggregator);
    }
    if (paymaster) {
      await this.reputationService.updateSeenStatus(paymaster);
    }
    if (factory) {
      await this.reputationService.updateSeenStatus(factory);
    }
  }
}
