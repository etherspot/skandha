import { UserOperationStruct } from 'app/@types';
import { MempoolEntry } from '../entities/MempoolEntry';
import { BigNumberish } from 'ethers';
import RpcError from 'app/errors/rpc-error';
import * as RpcErrorCodes from 'app/bundler/rpc/error-codes';

export class MempoolService {
  private entries: MempoolEntry[] = [];

  constructor(
    private chainId: number
  ) {}

  count() {
    return this.entries.length;
  }

  dump() {
    return this.entries;
  }

  addUserOp(userOp: UserOperationStruct, prefund: BigNumberish, aggregator?: string) {
    const entry = new MempoolEntry({
      chainId: this.chainId,
      userOp,
      prefund,
      aggregator
    });
    const existingEntryIdx = this.find(entry);
    if (existingEntryIdx !== -1) {
      if (!entry.canReplace(this.entries[existingEntryIdx]!)) {
        throw new RpcError('User op cannot be replaced: fee too low', RpcErrorCodes.INVALID_USEROP);
      }
      this.entries[existingEntryIdx] = entry;
    }
  }

  getSortedOps(): MempoolEntry[] {
    return this.entries.sort(MempoolEntry.CompareByCost);
  }

  private find(entry: MempoolEntry) {
    // TODO: fetch from rocksdb by hash {chainId:sender:nonce}
    return this.entries.findIndex(e => entry.isEqual(e));
  }
}