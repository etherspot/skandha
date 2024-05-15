import { fetchJson, hexValue } from "ethers/lib/utils";
import { BigNumber, providers } from "ethers";
import { parseGwei } from "./utils";
import { IGetGasFeeResult, IOracle } from "./interfaces";

export const getAncient8GasFee: IOracle = async (
  apiKey: string,
  provider?: providers.JsonRpcProvider
): Promise<IGetGasFeeResult> => {
  try {
    if (provider) {
      const gasPrice = await provider.getGasPrice();
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
  const maxPriorityFeePerGas = hexValue(
    BigNumber.from(gas_prices.average.priority_fee_wei)
  );
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
