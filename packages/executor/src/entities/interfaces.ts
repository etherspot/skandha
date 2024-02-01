import { BigNumberish, BytesLike } from "ethers";
import { UserOperation6And7 } from "types/lib/contracts/UserOperation";
import { MempoolEntryStatus, ReputationStatus } from "types/lib/executor";

export interface IMempoolEntry {
  chainId: number;
  userOp: UserOperation6And7;
  entryPoint: string;
  prefund: BigNumberish;
  aggregator?: string;
  factory?: string;
  paymaster?: string;
  userOpHash: string;
  lastUpdatedTime: number;
  hash?: string;
  status: MempoolEntryStatus;
  transaction?: string;
  submitAttempts: number;
}

export interface MempoolEntrySerialized {
  chainId: number;
  userOp: {
    sender: string;
    nonce: string;
    initCode?: BytesLike;
    callData: BytesLike;
    callGasLimit: string;
    verificationGasLimit: string;
    preVerificationGas: string;
    maxFeePerGas: string;
    maxPriorityFeePerGas: string;
    paymasterAndData?: BytesLike;
    signature: BytesLike;
    factory?: string;
    factoryData?: BytesLike;
    paymaster?: string;
    paymasterVerificationGasLimit?: BigNumberish;
    paymasterPostOpGasLimit?: BigNumberish;
    paymasterData?: BytesLike;
  };
  prefund: string;
  aggregator: string | undefined;
  factory: string | undefined;
  paymaster: string | undefined;
  userOpHash: string;
  hash: string | undefined;
  lastUpdatedTime: number;
  transaction: string | undefined;
  submitAttempts: number;
  status: MempoolEntryStatus;
}

export interface IReputationEntry {
  chainId: number;
  address: string;
  opsSeen: number;
  opsIncluded: number;
  lastUpdateTime: number;
}

export type ReputationEntryDump = Omit<
  IReputationEntry,
  "chainId" | "lastUpdateTime"
> & { status: ReputationStatus };

export type ReputationEntrySerialized = Omit<
  IReputationEntry,
  "address" | "chainId"
>;
