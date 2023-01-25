import { UserOperationStruct, IMempoolEntry } from 'app/@types';
import { BigNumberish, ethers } from 'ethers';

export class MempoolEntry implements IMempoolEntry {
  chainId: number;
  userOp: UserOperationStruct;
  prefund: BigNumberish;
  aggregator?: string;
  lastUpdatedTime: number;

  constructor({
    chainId,
    userOp,
    prefund,
    aggregator
  }: {
    chainId: number,
    userOp: UserOperationStruct,
    prefund: BigNumberish,
    aggregator: string | undefined
  }
  ) {
    this.chainId = chainId;
    this.userOp = userOp;
    this.prefund = prefund;
    if (aggregator) {
      this.aggregator = aggregator;
    }
    this.lastUpdatedTime = new Date().getTime();
  }

  /**
   * Returns true if given entry has less maxPriorityFeePerGas
   * @param entry MempoolEntry
   * @returns boolaen
   */
  public canReplace(entry: MempoolEntry): boolean {
    if (!this.isEqual(entry)) return false;
    return ethers.BigNumber
      .from(entry.userOp.maxPriorityFeePerGas)
      .lt(this.userOp.maxPriorityFeePerGas);
  }

  public isEqual(entry: MempoolEntry): boolean {
    return entry.chainId === entry.chainId &&
      entry.userOp.nonce === this.userOp.nonce &&
      entry.userOp.nonce === this.userOp.sender;
  }

  // sorts by cost in descending order
  public static CompareByCost(a: MempoolEntry, b: MempoolEntry): number {
    const {
      userOp: { maxPriorityFeePerGas: aFee }
    } = a;
    const {
      userOp: { maxPriorityFeePerGas: bFee }
    } = b;
    return ethers.BigNumber.from(bFee).sub(aFee).toNumber();
  }
}