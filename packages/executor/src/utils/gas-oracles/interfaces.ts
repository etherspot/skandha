import { BigNumberish, ethers } from "ethers";
import { UserOperationStruct } from "types/lib/executor/contracts/EntryPoint";

export type IGetGasFeeResult = {
  maxPriorityFeePerGas: BigNumberish | undefined;
  maxFeePerGas: BigNumberish | undefined;
  gasPrice: BigNumberish | undefined;
};

export type IOracle = (
  apiKey: string,
  provider?: ethers.providers.JsonRpcProvider,
  options?: IOracleOptions
) => Promise<IGetGasFeeResult>;

export type IOracleOptions = {
  entryPoint: string;
  userOp: UserOperationStruct;
};
