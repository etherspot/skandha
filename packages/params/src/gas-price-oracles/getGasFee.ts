/* eslint-disable no-console */
import { PublicClient } from "viem";
import {
  IGetGasFeeResult,
  IOracleOptions,
  oracles as gasOracles,
} from "./oracles";

export const getGasFee = async (
  chainId: number,
  publicClient: PublicClient,
  apiKey = "",
  options?: IOracleOptions
): Promise<IGetGasFeeResult> => {
  const oracles = gasOracles[chainId];
  if (oracles !== undefined) {
    try {
      if (Array.isArray(oracles)) {
        for (const oracle of oracles) {
          const result = await oracle(apiKey, publicClient, options).catch(
            (_) => {
              console.error(`Couldn't fetch fee data for ${chainId}`);
              return null;
            }
          );
          if (result != null) return result;
        }
      } else {
        return await oracles(apiKey, publicClient, options);
      }
    } catch (err) {
      console.error(`Couldn't fetch fee data for ${chainId}: ${err}`);
    }
  }

  try {
    const feeData = await publicClient.estimateFeesPerGas();
    return {
      maxPriorityFeePerGas:
        feeData.maxPriorityFeePerGas ?? feeData.gasPrice ?? 0,
      maxFeePerGas: feeData.maxFeePerGas ?? feeData.gasPrice ?? 0,
      gasPrice: feeData.gasPrice ?? 0,
    };
  } catch (err) {
    console.error(`Couldn't fetch fee data: ${err}`);
  }

  return {
    maxPriorityFeePerGas: undefined,
    maxFeePerGas: undefined,
    gasPrice: undefined,
  };
};
