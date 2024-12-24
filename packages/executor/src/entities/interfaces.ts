import { BigNumberish, BytesLike } from "ethers";
import { UserOperation } from "@skandha/types/lib/contracts/UserOperation";
import {
  MempoolEntryStatus,
  ReputationStatus,
} from "@skandha/types/lib/executor";

export interface IMempoolEntry {
  chainId: number;
  userOp: UserOperation;
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
  submittedTime?: number;
  actualTransaction?: string;
  revertReason?: string;
}

export interface MempoolEntrySerialized {
  chainId: number;
  userOp: {
    sender: string;
    nonce: string;
    callData: BytesLike;
    callGasLimit: string;
    verificationGasLimit: string;
    preVerificationGas: string;
    maxFeePerGas: string;
    maxPriorityFeePerGas: string;
    signature: BytesLike;
    factory?: string;
    factoryData?: BytesLike;
    paymaster?: string;
    paymasterVerificationGasLimit?: BigNumberish;
    paymasterPostOpGasLimit?: BigNumberish;
    paymasterData?: BytesLike;
    authorizationContract?: string;
    authorizationSignature: BytesLike;
    authorizationNonce?: number;
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
  submittedTime?: number;
  actualTransaction: string | undefined;
  revertReason: string | undefined;
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
