import { BigNumberish, BytesLike } from "ethers";
import { PackedUserOperationStruct } from "./EPv7/interfaces/IPaymaster";

export type NotPromise<T> = {
  [P in keyof T]: Exclude<T[P], Promise<any>>;
};

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
  eip7702Auth?: Eip7702Auth;
}

export type PackedUserOperation = NotPromise<PackedUserOperationStruct>;

export interface Eip7702Auth {
  chain: number;
  nonce: number;
  address: string;
  r: BytesLike;
  s: BytesLike;
  yParity: 0 | 1;
}
