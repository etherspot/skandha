import { BigNumberish } from "ethers";
import { IDbController } from "types/lib";
import RpcError from "types/lib/api/errors/rpc-error";
import * as RpcErrorCodes from "types/lib/api/errors/rpc-error-codes";
import { UserOperationStruct } from "types/lib/executor/contracts/EntryPoint";
import { getAddr, now } from "../utils";
import { MempoolEntry } from "../entities/MempoolEntry";
import { IMempoolEntry, MempoolEntrySerialized } from "../entities/interfaces";
import { NetworkConfig, StakeInfo } from "../interfaces";
import { ReputationService } from "./ReputationService";

export class MempoolService {
  private MAX_MEMPOOL_USEROPS_PER_SENDER = 4;
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
    });
    const existingEntry = await this.find(entry);
    if (existingEntry) {
      if (
        !entry.canReplaceWithTTL(existingEntry, this.networkConfig.useropsTTL)
      ) {
        throw new RpcError(
          "User op cannot be replaced: fee too low",
          RpcErrorCodes.INVALID_USEROP
        );
      }
      await this.db.put(this.getKey(entry), {
        ...entry,
        lastUpdatedTime: now(),
      });
      await this.removeUserOpHash(existingEntry.userOpHash);
      await this.saveUserOpHash(entry.userOpHash, entry);
    } else {
      const checkStake = await this.checkSenderCountInMempool(
        userOp,
        senderInfo
      );
      if (checkStake) {
        throw new RpcError(checkStake, RpcErrorCodes.INVALID_REQUEST);
      }
      const userOpKeys = await this.fetchKeys();
      const key = this.getKey(entry);
      userOpKeys.push(key);
      await this.db.put(this.USEROP_COLLECTION_KEY, userOpKeys);
      await this.db.put(key, { ...entry, lastUpdatedTime: now() });
      await this.saveUserOpHash(entry.userOpHash, entry);
    }
    await this.updateSeenStatus(userOp, aggregator);
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

  async getSortedOps(): Promise<MempoolEntry[]> {
    const allEntries = await this.fetchAll();
    return allEntries.sort(MempoolEntry.compareByCost);
  }

  async clearState(): Promise<void> {
    const keys = await this.fetchKeys();
    for (const key of keys) {
      await this.db.del(key);
    }
    await this.db.del(this.USEROP_COLLECTION_KEY);
  }

  /**
   * checks if the userOp is new or can replace the existing userOp in mempool
   * @returns true if new or replacing
   */
  async isNewOrReplacing(
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
    const existingEntry = await this.find(entry);
    return (
      !existingEntry ||
      entry.canReplaceWithTTL(existingEntry, this.networkConfig.useropsTTL)
    );
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

  async checkSenderCountInMempool(
    userOp: UserOperationStruct,
    userInfo: StakeInfo
  ): Promise<string | null> {
    const entries = await this.fetchAll();
    const count: number = entries.filter(
      ({ userOp: { sender } }) => sender === userOp.sender
    ).length;
    if (count >= this.MAX_MEMPOOL_USEROPS_PER_SENDER) {
      return this.reputationService.checkStake(userInfo);
    }
    return null;
  }

  rawEntryToMempoolEntry(raw: IMempoolEntry): MempoolEntry {
    return new MempoolEntry({
      chainId: raw.chainId,
      userOp: raw.userOp,
      entryPoint: raw.entryPoint,
      prefund: raw.prefund,
      aggregator: raw.aggregator,
      hash: raw.hash,
      userOpHash: raw.userOpHash,
    });
  }

  private async updateSeenStatus(
    userOp: UserOperationStruct,
    aggregator?: string
  ): Promise<void> {
    const paymaster = getAddr(userOp.paymasterAndData);
    const sender = getAddr(userOp.initCode);
    if (aggregator) {
      await this.reputationService.updateSeenStatus(aggregator);
    }
    if (paymaster) {
      await this.reputationService.updateSeenStatus(paymaster);
    }
    if (sender) {
      await this.reputationService.updateSeenStatus(sender);
    }
  }
}
