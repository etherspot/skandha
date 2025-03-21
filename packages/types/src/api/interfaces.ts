import { GetTransactionReceiptReturnType } from "viem";
import { IWhitelistedEntities } from "../executor";
import { UserOperation } from "../contracts/UserOperation";

type BigNumberish = bigint | number | `0x${string}` | `${number}` | string;

export type EstimatedUserOperationGas = {
  preVerificationGas: BigNumberish;
  verificationGas: BigNumberish;
  verificationGasLimit: BigNumberish;
  callGasLimit: BigNumberish;
  validAfter?: BigNumberish;
  validUntil?: BigNumberish;
} & GetGasPriceResponse;

export type UserOperationByHashResponse = {
  userOperation: UserOperation;
  entryPoint: string;
  blockNumber?: bigint;
  blockHash?: string;
  transactionHash?: string;
};

export type GetGasPriceResponse = {
  maxFeePerGas: BigNumberish;
  maxPriorityFeePerGas: BigNumberish;
};

export type GetFeeHistoryResponse = {
  actualGasPrice: BigNumberish[];
  maxFeePerGas: BigNumberish[];
  maxPriorityFeePerGas: BigNumberish[];
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
  receipt: GetTransactionReceiptReturnType;
};

export type GetConfigResponse = {
  chainId: number;
  flags: {
    redirectRpc: boolean;
    testingMode: boolean;
  };
  entryPoints: string[];
  beneficiary: string;
  relayers: string[];
  minInclusionDenominator: number;
  throttlingSlack: number;
  banSlack: number;
  minSignerBalance: string;
  minStake: string;
  minUnstakeDelay: number;
  multicall: string;
  estimationStaticBuffer: number;
  validationGasLimit: number;
  receiptLookupRange: number;
  etherscanApiKey: boolean; // true if set
  conditionalTransactions: boolean;
  rpcEndpointSubmit: boolean; // true if not empty string
  gasPriceMarkup: number;
  enforceGasPrice: boolean;
  enforceGasPriceThreshold: number;
  eip2930: boolean;
  useropsTTL: number;
  whitelistedEntities: IWhitelistedEntities;
  bundleGasLimitMarkup: number;
  relayingMode: string;
  bundleInterval: number;
  bundleSize: number;
  pvgMarkup: number;
  canonicalMempoolId: string;
  canonicalEntryPoint: string;
  gasFeeInSimulation: boolean;
  skipBundleValidation: boolean;
  cglMarkup: number;
  vglMarkup: number;
  fastlaneValidators: string[];
  archiveDuration: number;
  estimationGasLimit: number;
  pvgMarkupPercent: number;
  cglMarkupPercent: number;
  vglMarkupPercent: number;
  userOpGasLimit: number;
  bundleGasLimit: number;
  merkleApiURL: string;
  blockscoutUrl: string;
  blockscoutApiKeys: number;
  tenderlyApiUrl: boolean; // true if set
  tenderlyKey: boolean; // true if set
  tenderlySave: boolean;
  rpcTimeout: string;
  eip7702: boolean;
};

export type SupportedEntryPoints = string[];

export type EthChainIdResponse = { chainId: number };

export type BundlingMode = "auto" | "manual";

export interface ServerConfig {
  enableRequestLogging: boolean;
  port: number;
  host: string;
  cors: string;
  ws: boolean;
  wsPort: number;
}

export type UserOperationStatus = {
  userOp: UserOperation;
  entryPoint: string;
  status: string;
  transaction?: string;
  reason?: string;
};
