import { IGetGasFeeResult, IOracle } from "./interfaces";
import { parseGwei } from "./utils";

export const getMaticGasFee: IOracle = async (
  apiKey: string
): Promise<IGetGasFeeResult> => {
  let oracle =
    "https://api.polygonscan.com/api?module=gastracker&action=gasoracle";
  if (apiKey) {
    oracle += `&apikey=${apiKey}`;
  }
  const data = await (await fetch(oracle)).json();
  return {
    maxPriorityFeePerGas: parseGwei(data.result.FastGasPrice),
    maxFeePerGas: parseGwei(data.result.FastGasPrice),
    gasPrice: parseGwei(data.result.FastGasPrice),
  };
};
