import { BigNumberish, BytesLike } from 'ethers';
import { UserOperationStruct } from './erc4337';

export interface IMempoolEntry {
  chainId: number;
  userOp: UserOperationStruct;
  entryPoint: string;
  prefund: BigNumberish;
  aggregator?: string;
}

export interface MempoolEntrySerialized {
  chainId: number;
  userOp: {
    sender: string;
    nonce: string;
    initCode: BytesLike;
    callData: BytesLike;
    callGasLimit: string;
    verificationGasLimit: string;
    preVerificationGas: string;
    maxFeePerGas: string;
    maxPriorityFeePerGas: string;
    paymasterAndData: BytesLike;
    signature: BytesLike;
  }
  prefund: string,
  aggregator: string | undefined;
}
