import { IMempoolEntry, MempoolEntrySerialized, UserOperationStruct } from 'packages/api/src/@types';
import { MempoolEntry } from '../entities/MempoolEntry';
import { BigNumberish } from 'ethers';
import RpcError from 'packages/api/src/errors/rpc-error';
import * as RpcErrorCodes from 'packages/api/src/bundler/rpc/error-codes';
import { put, get, getMany, del } from 'packages/api/src/lib/rocksdb-connection';
import { getAddr, now } from 'packages/api/src/bundler/utils';
import { ReputationService } from './ReputationService';
import { StakeInfo } from './UserOpValidation';

export class MempoolService {
  private MAX_MEMPOOL_USEROPS_PER_SENDER = 4;
  private USEROP_COLLECTION_KEY: string;

  constructor(
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
    return (await this.fetchAll()).map(entry => entry.serialize());
  }

  async addUserOp(
    userOp: UserOperationStruct,
    entryPoint: string,
    prefund: BigNumberish,
    senderInfo: StakeInfo,
    aggregator?: string
  ) {
    const entry = new MempoolEntry({
      chainId: this.chainId,
      userOp,
      entryPoint,
      prefund,
      aggregator
    });
    const existingEntry = await this.find(entry);
    if (existingEntry) {
      if (!entry.canReplace(existingEntry)) {
        throw new RpcError('User op cannot be replaced: fee too low', RpcErrorCodes.INVALID_USEROP);
      }
      await put(
        this.getKey(entry),
        { ...entry, lastUpdatedTime: now() }
      );
    } else {
      const checkStake = await this.checkSenderCountInMempool(userOp, senderInfo);
      if (checkStake) {
        throw new RpcError(checkStake, RpcErrorCodes.INVALID_REQUEST);
      }
      const userOpKeys = await this.fetchKeys();
      const key = this.getKey(entry);
      userOpKeys.push(key);
      await put(this.USEROP_COLLECTION_KEY, userOpKeys);
      await put(key, { ...entry, lastUpdatedTime: now() });
    }
    await this.updateSeenStatus(userOp, aggregator);
  }

  public async remove(entry: MempoolEntry) {
    if (!entry) {
      return;
    }
    const key = this.getKey(entry);    
    const newKeys = (await this.fetchKeys()).filter(k => k !== key);
    await del(key);
    await put(this.USEROP_COLLECTION_KEY, newKeys);
  }

  public async removeUserOp(userOp: UserOperationStruct) {
    const entry = new MempoolEntry({
      chainId: this.chainId,
      userOp,
      entryPoint: '',
      prefund: 0,
      aggregator: ''
    });
    await this.remove(entry);
  }

  async getSortedOps(): Promise<MempoolEntry[]> {
    const allEntries = await this.fetchAll();
    return allEntries.sort(MempoolEntry.CompareByCost);
  }

  async clearState(): Promise<void> {
    const keys = await this.fetchKeys();
    for (const key of keys) {
      await del(key);
    }
    await del(this.USEROP_COLLECTION_KEY);
  }

  private async find(entry: MempoolEntry): Promise<MempoolEntry | null> {
    const raw = await get<IMempoolEntry>(this.getKey(entry)).catch(_ => null);
    if (raw) {
      return this.rawEntryToMempoolEntry(raw);
    }
    return null;
  }

  private getKey(entry: IMempoolEntry) {
    return `${this.chainId}:${entry.userOp.sender}:${entry.userOp.nonce}`;
  }

  private async fetchKeys(): Promise<string[]> {
    const userOpKeys = await get<string[]>(
      this.USEROP_COLLECTION_KEY
    ).catch(_ => []);
    if (userOpKeys) {
      return userOpKeys;
    }
    return [];
  }

  private async fetchAll(): Promise<MempoolEntry[]> {
    const keys = await this.fetchKeys();
    const rawEntries = await getMany<MempoolEntry>(keys);
    return rawEntries.map(this.rawEntryToMempoolEntry);
  }

  private async checkSenderCountInMempool(userOp: UserOperationStruct, userInfo: StakeInfo) {
    const entries = await this.fetchAll();
    const count: number = entries
      .filter(({ userOp: { sender } }) => sender === userOp.sender)
      .length;
    if (count >= this.MAX_MEMPOOL_USEROPS_PER_SENDER) {
      return this.reputationService.checkStake(userInfo);
    }
    return null;
  }

  private updateSeenStatus (userOp: UserOperationStruct, aggregator?: string): void {
    const paymaster = getAddr(userOp.paymasterAndData);
    const sender = getAddr(userOp.initCode);
    if (aggregator) {
      this.reputationService.updateSeenStatus(aggregator);
    }
    if (paymaster) {
      this.reputationService.updateSeenStatus(paymaster);
    }
    if (sender) {
      this.reputationService.updateSeenStatus(sender);
    }
  }

  private rawEntryToMempoolEntry(raw: IMempoolEntry) {
    return new MempoolEntry({
      chainId: raw.chainId,
      userOp: raw.userOp,
      entryPoint: raw.entryPoint,
      prefund: raw.prefund,
      aggregator: raw.aggregator
    });
  }
}