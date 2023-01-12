import {
  BigNumber,
  BigNumberish,
  BytesLike
} from 'ethers';

export type DepositInfoStruct = {
  deposit: BigNumberish;
  staked: boolean;
  stake: BigNumberish;
  unstakeDelaySec: BigNumberish;
  withdrawTime: BigNumberish;
};

export type DepositInfoStructOutput = [
  BigNumber,
  boolean,
  BigNumber,
  number,
  BigNumber
] & {
  deposit: BigNumber;
  staked: boolean;
  stake: BigNumber;
  unstakeDelaySec: number;
  withdrawTime: BigNumber;
};

export type UserOperationStruct = {
  sender: string;
  nonce: BigNumberish;
  initCode: BytesLike;
  callData: BytesLike;
  callGasLimit: BigNumberish;
  verificationGasLimit: BigNumberish;
  preVerificationGas: BigNumberish;
  maxFeePerGas: BigNumberish;
  maxPriorityFeePerGas: BigNumberish;
  paymasterAndData: BytesLike;
  signature: BytesLike;
};

export type UserOperationStructOutput = [
  string,
  BigNumber,
  string,
  string,
  BigNumber,
  BigNumber,
  BigNumber,
  BigNumber,
  BigNumber,
  string,
  string
] & {
  sender: string;
  nonce: BigNumber;
  initCode: string;
  callData: string;
  callGasLimit: BigNumber;
  verificationGasLimit: BigNumber;
  preVerificationGas: BigNumber;
  maxFeePerGas: BigNumber;
  maxPriorityFeePerGas: BigNumber;
  paymasterAndData: string;
  signature: string;
};

export type UserOpsPerAggregatorStruct = {
  userOps: UserOperationStruct[];
  aggregator: string;
  signature: BytesLike;
};

export type UserOpsPerAggregatorStructOutput = [
  UserOperationStructOutput[],
  string,
  string
] & {
  userOps: UserOperationStructOutput[];
  aggregator: string;
  signature: string;
};

export type MemoryUserOpStruct = {
  sender: string;
  nonce: BigNumberish;
  callGasLimit: BigNumberish;
  verificationGasLimit: BigNumberish;
  preVerificationGas: BigNumberish;
  paymaster: string;
  maxFeePerGas: BigNumberish;
  maxPriorityFeePerGas: BigNumberish;
};

export type MemoryUserOpStructOutput = [
  string,
  BigNumber,
  BigNumber,
  BigNumber,
  BigNumber,
  string,
  BigNumber,
  BigNumber
] & {
  sender: string;
  nonce: BigNumber;
  callGasLimit: BigNumber;
  verificationGasLimit: BigNumber;
  preVerificationGas: BigNumber;
  paymaster: string;
  maxFeePerGas: BigNumber;
  maxPriorityFeePerGas: BigNumber;
};

export type UserOpInfoStruct = {
  mUserOp: MemoryUserOpStruct;
  userOpHash: BytesLike;
  prefund: BigNumberish;
  contextOffset: BigNumberish;
  preOpGas: BigNumberish;
};

export type UserOpInfoStructOutput = [
  MemoryUserOpStructOutput,
  string,
  BigNumber,
  BigNumber,
  BigNumber
] & {
  mUserOp: MemoryUserOpStructOutput;
  userOpHash: string;
  prefund: BigNumber;
  contextOffset: BigNumber;
  preOpGas: BigNumber;
};
