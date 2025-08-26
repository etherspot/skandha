import { PublicClient } from "viem";
import { IGetGasFeeResult, IOracle } from "./interfaces";

export const getEthGasPrice: IOracle = async (
  apiKey: string,
  publicClient?: PublicClient
): Promise<IGetGasFeeResult> => {
  if (!publicClient) throw new Error("no provider");
  const gasPrice = await publicClient.getGasPrice();
  return {
    maxPriorityFeePerGas: gasPrice,
    gasPrice: gasPrice,
    maxFeePerGas: gasPrice,
  };
};
