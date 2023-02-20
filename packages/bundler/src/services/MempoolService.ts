import { BigNumberish } from "ethers";
import { DbController } from "db/lib";
import RpcError from "../errors/rpc-error";
import * as RpcErrorCodes from "../errors/rpc-error-codes";
import { getAddr, now } from "../utils";
import { MempoolEntry } from "../entities/MempoolEntry";
import { UserOperationStruct } from "../contracts/EntryPoint";
import { IMempoolEntry, MempoolEntrySerialized } from "../entities/interfaces";
import { ReputationService } from "./ReputationService";
import { StakeInfo } from "./UserOpValidation";

export class MempoolService {
  private MAX_MEMPOOL_USEROPS_PER_SENDER = 4;
  private USEROP_COLLECTION_KEY: string;

  constructor(
    private db: DbController,
    private chainId: number,
    private reputationService: ReputationService
  ) {
    this.USEROP_COLLECTION_KEY = `${chainId}:USEROPKEYS`;
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
    });
    const existingEntry = await this.find(entry);
    if (existingEntry) {
      if (!entry.canReplace(existingEntry)) {
        throw new RpcError(
          "User op cannot be replaced: fee too low",
          RpcErrorCodes.INVALID_USEROP
        );
      }
      await this.db.put(this.getKey(entry), {
        ...entry,
        lastUpdatedTime: now(),
      });
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

  async removeUserOp(userOp: UserOperationStruct): Promise<void> {
    const entry = new MempoolEntry({
      chainId: this.chainId,
      userOp,
      entryPoint: "",
      prefund: 0,
    });
    await this.remove(entry);
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

  private async find(entry: MempoolEntry): Promise<MempoolEntry | null> {
    const raw = await this.db
      .get<IMempoolEntry>(this.getKey(entry))
      .catch(() => null);
    if (raw) {
      return this.rawEntryToMempoolEntry(raw);
    }
    return null;
  }

  private getKey(entry: IMempoolEntry): string {
    return `${this.chainId}:${entry.userOp.sender}:${entry.userOp.nonce}`;
  }

  private async fetchKeys(): Promise<string[]> {
    const userOpKeys = await this.db
      .get<string[]>(this.USEROP_COLLECTION_KEY)
      .catch(() => []);
    return userOpKeys;
  }

  private async fetchAll(): Promise<MempoolEntry[]> {
    const keys = await this.fetchKeys();
    const rawEntries = await this.db.getMany<MempoolEntry>(keys);
    return rawEntries.map(this.rawEntryToMempoolEntry);
  }

  private async checkSenderCountInMempool(
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

  private rawEntryToMempoolEntry(raw: IMempoolEntry): MempoolEntry {
    return new MempoolEntry({
      chainId: raw.chainId,
      userOp: raw.userOp,
      entryPoint: raw.entryPoint,
      prefund: raw.prefund,
      aggregator: raw.aggregator,
      hash: raw.hash,
    });
  }
}
