import { providers } from "ethers";
import { IGetGasFeeResult, IOracle } from "./interfaces";

export const getEthGasPrice: IOracle = async (
  apiKey: string,
  provider?: providers.JsonRpcProvider
): Promise<IGetGasFeeResult> => {
  if (!provider) throw new Error("no provider");
  const gasPrice = await provider.getGasPrice();
  return {
    maxPriorityFeePerGas: gasPrice,
    gasPrice: gasPrice,
    maxFeePerGas: gasPrice,
  };
};
