import { BigNumberish, BytesLike } from "ethers";
import { PackedUserOperationStruct } from "./EPv7/interfaces/IPaymaster";

export type NotPromise<T> = {
  [P in keyof T]: Exclude<T[P], Promise<any>>
}

export interface UserOperation {
  sender: string;
  nonce: BigNumberish;
  factory?: string;
  factoryData?: BytesLike;
  callData: BytesLike;
  callGasLimit: BigNumberish;
  verificationGasLimit: BigNumberish;
  preVerificationGas: BigNumberish;
  maxFeePerGas: BigNumberish;
  maxPriorityFeePerGas: BigNumberish;
  paymaster?: string;
  paymasterVerificationGasLimit?: BigNumberish;
  paymasterPostOpGasLimit?: BigNumberish;
  paymasterData?: BytesLike;
  signature: BytesLike;
}

export type PackedUserOperation = NotPromise<PackedUserOperationStruct>