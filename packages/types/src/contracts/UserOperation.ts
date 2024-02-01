import { BigNumberish, BytesLike } from "ethers";

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

export interface UserOperation6And7 {
  sender: string;
  nonce: BigNumberish;
  callData: BytesLike;
  callGasLimit: BigNumberish;
  verificationGasLimit: BigNumberish;
  preVerificationGas: BigNumberish;
  maxFeePerGas: BigNumberish;
  maxPriorityFeePerGas: BigNumberish;
  signature: BytesLike;

  factory?: string;
  factoryData?: BytesLike;
  paymaster?: string;
  paymasterVerificationGasLimit?: BigNumberish;
  paymasterPostOpGasLimit?: BigNumberish;
  paymasterData?: BytesLike;

  initCode?: BytesLike;
  paymasterAndData?: BytesLike;
}
