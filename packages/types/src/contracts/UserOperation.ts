import { Hex } from "viem";
import { PackedUserOperationStruct } from "./EPv7/interfaces/IPaymaster";

type BigNumberish = bigint | number | `0x${string}` | `${number}` | string;

export type NotPromise<T> = {
  [P in keyof T]: Exclude<T[P], Promise<any>>;
};

export interface UserOperation {
  sender: Hex;
  nonce: BigNumberish;
  factory?: Hex;
  factoryData?: Hex;
  callData: Hex;
  callGasLimit: BigNumberish;
  verificationGasLimit: BigNumberish;
  preVerificationGas: BigNumberish;
  maxFeePerGas: BigNumberish;
  maxPriorityFeePerGas: BigNumberish;
  paymaster?: string;
  paymasterVerificationGasLimit?: BigNumberish;
  paymasterPostOpGasLimit?: BigNumberish;
  paymasterData?: Hex;
  signature: Hex;
  eip7702Auth?: Eip7702Auth;
}

export type PackedUserOperation = NotPromise<PackedUserOperationStruct>;

export interface Eip7702Auth {
  chainId: BigNumberish;
  nonce: BigNumberish;
  address: Hex;
  r: Hex;
  s: Hex;
  yParity: "0x0" | "0x1";
}
