import { providers } from "ethers";
import { NetworkName } from "types/lib";
import { IGetGasFeeResult, oracles } from "./gas-oracles";

export const getGasFee = async (
  network: NetworkName,
  provider: providers.JsonRpcProvider,
  apiKey = ""
): Promise<IGetGasFeeResult> => {
  if (oracles[network]) {
    try {
      return await oracles[network]!(apiKey);
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
