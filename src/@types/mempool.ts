import { BigNumberish } from 'ethers';
import { UserOperationStruct } from './erc4337';

export interface IMempoolEntry {
  chainId: number;
  userOp: UserOperationStruct;
  prefund: BigNumberish;
  aggregator?: string;
}
