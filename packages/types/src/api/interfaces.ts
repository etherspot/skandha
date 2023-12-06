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
    unsafeMode: boolean;
  };
  entryPoints: string[];
  beneficiary: string;
  relayer: string;
  minInclusionDenominator: number;
  throttlingSlack: number;
  banSlack: number;
  minSignerBalance: string;
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
