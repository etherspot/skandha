import { BigNumberish, providers } from "ethers";
import { UserOperationStruct } from "../executor/contracts/EntryPoint";
import { IWhitelistedEntities } from "../executor";

export type EstimatedUserOperationGas =
  | {
      preVerificationGas: BigNumberish;
      verificationGas: BigNumberish;
      verificationGasLimit: BigNumberish;
      callGasLimit: BigNumberish;
      validAfter?: BigNumberish;
      validUntil?: BigNumberish;
    }
  | GetGasPriceResponse;

export type UserOperationByHashResponse = {
  userOperation: UserOperationStruct;
  entryPoint: string;
  blockNumber?: number;
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

export type UserOperationStatus = {
  userOp: UserOperationStruct;
  entryPoint: string;
  status: string;
  transaction?: string;
  reason?: string;
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
  minUnstakeDelay: number;
  minSignerBalance: string;
  minStake: string;
  multicall: string;
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
  cglMarkup: number;
  vglMarkup: number;
  skipBundleValidation: boolean;
  entryPointForwarder: string;
  gasFeeInSimulation: boolean;
  userOpGasLimit: number;
  bundleGasLimit: number;
  archiveDuration: number;
  fastlaneValidators: string[];
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
