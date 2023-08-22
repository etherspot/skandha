import { IGetGasFeeResult, IOracle } from "./interfaces";
import { parseGwei } from "./utils";

export const getMaticGasFee: IOracle = async (): Promise<IGetGasFeeResult> => {
  const oracle = "https://gasstation.polygon.technology/v2";
  const data = await (await fetch(oracle)).json();
  return {
    maxPriorityFeePerGas: parseGwei(data.fast.maxPriorityFee),
    maxFeePerGas: parseGwei(data.fast.maxFee),
    gasPrice: parseGwei(data.fast.maxFee),
  };
};
