import { BigNumberish, BytesLike, providers } from "ethers";
import { UserOperationStruct } from "./contracts/EntryPoint";

export type EstimatedUserOperationGas = {
  preVerificationGas: BigNumberish;
  callGasLimit: BigNumberish;
  verificationGas: BigNumberish;
  deadline?: BigNumberish;
};

export type UserOperationByHashResponse = {
  userOperation: UserOperationStruct;
  entryPoint: string;
  blockNumber: number;
  blockHash: string;
  transactionHash: string;
};

export type UserOperationReceipt = {
  userOpHash: string;
  sender: string;
  nonce: BigNumberish;
  paymaster?: string;
  actualGasCost: BigNumberish;
  actualGasUsed: BigNumberish;
  success: boolean;
  reason?: string;
  logs: any[];
  receipt: providers.TransactionReceipt;
};

export interface Log {
  blockNumber: number;
  blockHash: string;
  transactionIndex: number;

  removed: boolean;

  address: string;
  data: string;

  topics: Array<string>;

  transactionHash: string;
  logIndex: number;
}

export interface TracerResult {
  trace: TracerTracer;
  calls: TracerCall[];
}

export interface TracerTracer {
  [address: string]: {
    balance?: BigNumberish;
    contractSize?: number;
    number?: number;
    storage?: {
      [slot: string]: number;
    };
    keccak?: {
      [slot: string]: any;
    };
    violation?: {
      [opcode: string]: boolean;
    };
    value?: number;
  };
}

export interface TracerCall {
  type: string;
  from?: string;
  to?: string;
  method?: string;
  gas?: number;
  data?: string;
  return?: any;
  revert?: any;
  value?: BigNumberish;
}

export interface TracerPrestateResponse {
  [address: string]: {
    balance: BigNumberish;
    nonce: number;
    storage: {
      [slot: string]: number;
    };
    code: BytesLike;
  };
}

export type SupportedEntryPoints = string[];

export type EthChainIdResponse = { chainId: number };

export type BundlingMode = "auto" | "manual";
