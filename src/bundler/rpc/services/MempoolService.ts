import { UserOperationStruct } from 'app/@types';
import { MempoolEntry } from '../entities/MempoolEntry';
import { BigNumberish } from 'ethers';
import RpcError from 'app/errors/rpc-error';
import * as RpcErrorCodes from 'app/bundler/rpc/error-codes';
import { put, get, getMany, del } from 'app/lib/rocksdb-connection';
import { now } from 'app/bundler/utils';

export class MempoolService {
  private USEROP_COLLECTION_KEY: string;

  constructor(
    private chainId: number
  ) {
    this.USEROP_COLLECTION_KEY = `${chainId}:USEROPKEYS`;
  }

  async count(): Promise<number> {
    const userOpKeys: string[] = await this.fetchKeys();
    return userOpKeys.length;
  }

  async dump(): Promise<MempoolEntry[]> {
    return await this.fetchAll();
  }

  async addUserOp(userOp: UserOperationStruct, entryPoint: string, prefund: BigNumberish, aggregator?: string) {
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
      const userOpKeys = await this.fetchKeys();
      const key = this.getKey(entry);
      userOpKeys.push(key);
      await put(
        this.USEROP_COLLECTION_KEY,
        userOpKeys
      );
      await put(
        key,
        { ...entry, lastUpdatedTime: now() }
      );
    }
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

  private async find(entry: MempoolEntry): Promise<MempoolEntry | null> {
    return get<MempoolEntry>(this.getKey(entry)).catch(_ => null);
  }

  private getKey(entry: MempoolEntry) {
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
    return await getMany<MempoolEntry>(keys);
  }
}