import { BigNumberish } from "ethers";

export type IGetGasFeeResult = {
  maxPriorityFeePerGas: BigNumberish | undefined;
  maxFeePerGas: BigNumberish | undefined;
  gasPrice: BigNumberish | undefined;
};

export type IOracle = (apiKey: string) => Promise<IGetGasFeeResult>;
