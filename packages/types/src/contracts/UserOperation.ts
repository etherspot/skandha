import { Hex } from "viem";

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
  paymaster?: Hex;
  paymasterVerificationGasLimit?: BigNumberish;
  paymasterPostOpGasLimit?: BigNumberish;
  paymasterData?: Hex;
  signature: Hex;
  eip7702Auth?: Eip7702Auth;
}

// export type PackedUserOperation = NotPromise<PackedUserOperationStruct>;

export type PackedUserOperation = {
  sender: Hex;
  nonce: bigint;
  initCode: Hex;
  callData: Hex;
  accountGasLimits: Hex;
  preVerificationGas: bigint;
  gasFees: Hex;
  paymasterAndData: Hex;
  signature: Hex;
};

export interface Eip7702Auth {
  chainId: BigNumberish;
  nonce: BigNumberish;
  address: Hex;
  r: Hex;
  s: Hex;
  yParity: "0x0" | "0x1";
}
