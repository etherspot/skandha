import { BigNumberish, BytesLike } from "ethers";
import { NetworkName } from "types/lib";
import { MempoolEntry } from "./entities/MempoolEntry";

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
      [slot: string]: number | string;
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
  // TODO: why is this different from `obj: object` or `obj: any`?
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
  // enables contidional rpc
  conditionalTransactions: boolean;
  // rpc endpoint that is used only during submission of a bundle
  rpcEndpointSubmit: string;
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

export interface SlotMap {
  [slot: string]: string;
}

export interface StorageMap {
  [address: string]: string | SlotMap;
}

export interface ReferencedCodeHashes {
  // addresses accessed during this user operation
  addresses: string[];
  // keccak over the code of all referenced addresses
  hash: string;
}

export interface UserOpValidationResult {
  returnInfo: {
    preOpGas: BigNumberish;
    prefund: BigNumberish;
    deadline: number;
    sigFailed: boolean;
  };

  senderInfo: StakeInfo;
  factoryInfo: StakeInfo;
  paymasterInfo: StakeInfo;
  aggregatorInfo: StakeInfo;
  referencedContracts?: ReferencedCodeHashes;
  storageMap?: StorageMap;
}

export interface StakeInfo {
  addr: string;
  stake: BigNumberish;
  unstakeDelaySec: BigNumberish;
}

export interface Bundle {
  entries: MempoolEntry[];
  storageMap: StorageMap;
}
