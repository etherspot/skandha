import { BigNumberish, BytesLike } from "ethers";

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

type LogCallback = (
  error?: any,
  level?: string,
  message?: string,
  meta?: any
) => void;

interface LeveledLogMethod {
  (message: string, callback: LogCallback): Logger;
  (message: string, meta: any, callback: LogCallback): Logger;
  (message: string, ...meta: any[]): Logger;
  (message: any): Logger;
  (infoObject: object): Logger;
}

export interface Logger {
  error: LeveledLogMethod;
  warn: LeveledLogMethod;
  help: LeveledLogMethod;
  data: LeveledLogMethod;
  info: LeveledLogMethod;
  debug: LeveledLogMethod;
  prompt: LeveledLogMethod;
  http: LeveledLogMethod;
  verbose: LeveledLogMethod;
  input: LeveledLogMethod;
  silly: LeveledLogMethod;
}
