import { BigNumber, BigNumberish, BytesLike } from "ethers";
import { NetworkName } from "types/lib";
import { Executor } from "./executor";
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

export type Executors = Map<number, Executor>;
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
  // adds % markup on reported gas price via skandha_getGasPrice
  // 10000 = 100.00%
  // 500 = 5%
  gasPriceMarkup: number;
  // do not bundle userops with low gas prices
  enforceGasPrice: boolean;
  // gas price threshold in bps
  // 10000 = 100.00%, 500 = 5%
  // if set to 500, then the userop's gas price is allowed to be
  // 5% lower than the networks gas prices
  enforceGasPriceThreshold: number;
  // enables eip-2930
  // pls check if the node supports eip-2930 before enabling this flag
  // can not be used in unsafeMode and on chains that dont support 1559
  eip2930: boolean;
  // Userops time to live in seconds
  // default is 300 (5 minutes)
  // after ttl you can replace a userop without increasing gas fees
  useropsTTL: number;
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
  redirectRpc: boolean;
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
    sigFailed: boolean;
    validAfter: number;
    validUntil: number;
  };

  senderInfo: StakeInfo;
  factoryInfo?: StakeInfo;
  paymasterInfo?: StakeInfo;
  aggregatorInfo?: StakeInfo;
  referencedContracts?: ReferencedCodeHashes;
  storageMap?: StorageMap;
}

export interface ExecutionResult {
  preOpGas: BigNumber;
  paid: number;
  validAfter: number;
  validUntil: number;
  targetSuccess: boolean;
  targetResult: string;
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
