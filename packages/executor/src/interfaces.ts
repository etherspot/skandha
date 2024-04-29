import { BigNumber, BigNumberish, BytesLike } from "ethers";
import { IWhitelistedEntities, RelayingMode } from "types/lib/executor";
import { INodeAPI } from "types/lib/node";
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

export type GetNodeAPI = () => INodeAPI | null;

export interface NetworkConfig {
  entryPoints: string[];
  relayers: string[];
  beneficiary: string;
  rpcEndpoint: string;
  minInclusionDenominator: number;
  throttlingSlack: number;
  banSlack: number;
  minSignerBalance: BigNumberish;
  // minimum entity stake (in wei)
  // default: 0.01 ether
  minStake?: BigNumberish;
  // min unstake delay
  // default: 1
  minUnstakeDelay: number;
  multicall: string;
  // adds certain amount of gas to callGasLimit
  // 35000 by default
  cglMarkup: number;
  // adds certain amount of gas to verificationGasLimit
  // 35000 by default
  vglMarkup: number;
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
  // Entities that bypass stake and opcode validation
  // https://eips.ethereum.org/EIPS/eip-4337#alternative-mempools
  whitelistedEntities: IWhitelistedEntities;
  // adds some amount of gas to a estimated bundle
  bundleGasLimitMarkup: number;
  // relaying mode: via Flashbots Builder API or classic relaying
  // default is "classic"
  // if flashbots is used, "rpcEndpointSubmit" must be set
  relayingMode: RelayingMode;
  // Interval of bundling
  // default is 10 seconds
  bundleInterval: number;
  // max bundle size in terms of user ops
  // default is 4
  bundleSize: number;
  // adds markup on PVG
  // 1000 = adds 1000 gas on top of estimated PVG
  // default = 0
  pvgMarkup: number;
  // canonical mempool id
  canonicalMempoolId: string;
  // canonical entry point
  canonicalEntryPoint: string;
  // add gas fee in simulated transactions (may be required for some rpc providers)
  gasFeeInSimulation: boolean;
  // api url of Merkle.io (by default https://pool.merkle.io)
  merkleApiURL: string;
  // skips bundle validation
  skipBundleValidation: boolean;
  userOpGasLimit: number; // 25kk by default
  bundleGasLimit: number; // 25kk by default
  kolibriAuthKey: string;
  // catches EntryPoint v6 simulation reverts and returns them without revert
  entryPointForwarder: string;
  // api auth key for echo: https://echo.chainbound.io/docs/usage/api-interface#authentication
  echoAuthKey: string;
  // keep submitted, reverted and cancelled userops in the mempool  for this many seconds
  // default: 24 hours
  archiveDuration: number;
  fastlaneValidators: string[];
}

export type BundlerConfig = Omit<
  NetworkConfig,
  "entryPoints" | "rpcEndpoint" | "relayer" | "relayers"
>;

export interface ConfigOptions {
  config: NetworkConfig | null;
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
  maxFeePerGas: BigNumber;
  maxPriorityFeePerGas: BigNumber;
  storageMap: StorageMap;
}

export interface GetStakeStatus {
  stakeInfo: StakeInfo;
  isStaked: boolean;
}

export interface KnownEntities {
  accounts: string[];
  otherEntities: string[];
}
