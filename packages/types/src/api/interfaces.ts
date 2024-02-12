import { BigNumberish, providers } from "ethers";
import { IWhitelistedEntities } from "../executor";
import { UserOperation6And7 } from "../contracts/UserOperation";

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
  userOperation: UserOperation6And7;
  entryPoint: string;
  blockNumber: number;
  blockHash: string;
  transactionHash: string;
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
  receipt: providers.TransactionReceipt;
};

export type GetConfigResponse = {
  chainId: number;
  flags: {
    redirectRpc: boolean;
    testingMode: boolean;
  };
  entryPointsV6: string[];
  entryPointsV7: string[];
  entryPointV7Simulation: string;
  beneficiary: string;
  relayers: string[];
  minInclusionDenominator: number;
  throttlingSlack: number;
  banSlack: number;
  minSignerBalance: string;
  minStake: string;
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
  minUnstakeDelay: number;
  pvgMarkup: number;
  canonicalMempoolId: string;
  canonicalEntryPoint: string;
};

export type SupportedEntryPoints = string[];

export type EthChainIdResponse = { chainId: number };

export type BundlingMode = "auto" | "manual";

export interface ServerConfig {
  enableRequestLogging: boolean;
  port: number;
  host: string;
  cors: string;
}
