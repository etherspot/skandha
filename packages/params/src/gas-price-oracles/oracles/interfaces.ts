import { BigNumberish, ethers } from "ethers";
import { UserOperation6And7 } from "types/lib/contracts/UserOperation";

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
  userOp: UserOperation6And7;
};
