import { providers } from "ethers";
import { IGetGasFeeResult, IOracleOptions, oracles } from "./oracles";

export const getGasFee = async (
  chainId: number,
  provider: providers.JsonRpcProvider,
  apiKey = "",
  options?: IOracleOptions
): Promise<IGetGasFeeResult> => {
  if (oracles[chainId] !== undefined) {
    try {
      return await oracles[chainId]!(apiKey, provider, options);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error(`Couldn't fetch fee data for ${chainId}: ${err}`);
    }
  }

  try {
    const feeData = await provider.getFeeData();
    return {
      maxPriorityFeePerGas: feeData.maxPriorityFeePerGas ?? feeData.gasPrice ?? 0,
      maxFeePerGas: feeData.maxFeePerGas ?? feeData.gasPrice ?? 0,
      gasPrice: feeData.gasPrice ?? 0,
    };
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(`Couldn't fetch fee data: ${err}`);
  }

  return {
    maxPriorityFeePerGas: undefined,
    maxFeePerGas: undefined,
    gasPrice: undefined,
  };
};
