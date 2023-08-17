import { providers } from "ethers";
import { NetworkName } from "types/lib";
import { IGetGasFeeResult, IOracleOptions, oracles } from "./gas-oracles";

export const getGasFee = async (
  network: NetworkName,
  provider: providers.JsonRpcProvider,
  apiKey = "",
  options?: IOracleOptions
): Promise<IGetGasFeeResult> => {
  if (oracles[network]) {
    try {
      return await oracles[network]!(apiKey, provider, options);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error(`Couldn't fetch fee data for ${network}: ${err}`);
    }
  }

  try {
    const feeData = await provider.getFeeData();
    return {
      maxPriorityFeePerGas: feeData.maxPriorityFeePerGas ?? 0,
      maxFeePerGas: feeData.maxFeePerGas ?? 0,
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
