import { BigNumberish, BytesLike } from "ethers";
import { NetworkName } from "types/lib";
import { Executor } from "./executor";

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

export interface LogFn {
  /* tslint:disable:no-unnecessary-generics */
  <T extends object>(obj: T, msg?: string, ...args: any[]): void;
  (obj: unknown, msg?: string, ...args: any[]): void;
  (msg: string, ...args: any[]): void;
}

export interface Logger {
  fatal: LogFn;
  error: LogFn;
  warn: LogFn;
  info: LogFn;
  debug: LogFn;
  trace: LogFn;
  silent: LogFn;
}

export type Executors = Map<NetworkName, Executor>;
export interface NetworkConfig {
  entryPoints: string[];
  relayer: string;
  beneficiary: string;
  name?: NetworkName;
  rpcEndpoint: string;
  minInclusionDenominator: number;
  throttlingSlack: number;
  banSlack: number;
  minSignerBalance: BigNumberish;
  multicall: string;
  // reduces baseFee by a given number in % before dividing paid gas
  // use this as a buffer to callGasLimit
  // 25% by default
  estimationBaseFeeDivisor: number;
  // adds certain amount of gas to callGasLimit
  // 21000 by default
  estimationStaticBuffer: number;
  // gas limit during simulateHandleOps and simulateValidation calls
  // default = 10e6
  validationGasLimit: number;
  // limits the block range of getUserOperationByHash and getUserOperationReceipt
  // if requests to those endpoints are timing out, reduce this value
  // default = 1024
  receiptLookupRange: number;
  // etherscan api is used to fetch gas prices
  // default = "" (empty string)
  etherscanApiKey: string;
}

export type BundlerConfig = Omit<
  NetworkConfig,
  "entryPoints" | "rpcEndpoint" | "relayer" | "beneficiary"
>;

export type Networks = {
  [network in NetworkName]?: NetworkConfig;
};

export interface ConfigOptions {
  networks: Networks;
  testingMode?: boolean;
  unsafeMode: boolean;
}
