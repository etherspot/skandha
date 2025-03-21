import { fetchJson } from "ethers/lib/utils";
import { PublicClient } from "viem";
import { parseGwei } from "./utils";
import { IGetGasFeeResult, IOracle } from "./interfaces";

export const getAncient8GasFee: IOracle = async (
  apiKey: string,
  publicClient?: PublicClient
): Promise<IGetGasFeeResult> => {
  try {
    if (publicClient) {
      const gasPrice = await publicClient.getGasPrice();
      return {
        maxPriorityFeePerGas: gasPrice,
        gasPrice: gasPrice,
        maxFeePerGas: gasPrice,
      };
    }
  } catch (err) {
    /* empty */
  }

  const { gas_prices }: Ancient8Response = await fetchJson({
    url: "https://scan.ancient8.gg/api/v2/stats",
    headers: {
      "updated-gas-oracle": "true",
    },
  });
  const maxPriorityFeePerGas = BigInt(gas_prices.average.priority_fee_wei);
  const maxFeePerGas = parseGwei(gas_prices.average.priority_fee);
  return {
    maxPriorityFeePerGas: maxPriorityFeePerGas,
    gasPrice: maxFeePerGas,
    maxFeePerGas: maxFeePerGas,
  };
};

type Ancient8Response = {
  gas_prices: {
    average: {
      base_fee: number;
      fiat_price: string;
      price: number;
      priority_fee: number;
      priority_fee_wei: string;
      time: number;
      wei: string;
    };
    fast: {
      base_fee: number;
      fiat_price: string;
      price: number;
      priority_fee: number;
      priority_fee_wei: string;
      time: number;
      wei: string;
    };
    slow: {
      base_fee: number;
      fiat_price: string;
      price: number;
      priority_fee: number;
      priority_fee_wei: string;
      time: number;
      wei: string;
    };
  };
};
