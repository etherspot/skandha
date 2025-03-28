import { parseUnits } from "viem";
import { IGetGasFeeResult } from "./interfaces";

export async function getEtherscanGasFee(
  apiUrl: string,
  apiKey: string | undefined = undefined
): Promise<IGetGasFeeResult> {
  let oracle = `${apiUrl}?module=proxy&action=eth_gasPrice`;
  if (apiKey) {
    oracle += `&apikey=${apiKey}`;
  }
  const data = await (await fetch(oracle)).json();
  const gasPrice = BigInt(data.result);
  return {
    maxPriorityFeePerGas: gasPrice,
    maxFeePerGas: gasPrice,
    gasPrice: gasPrice,
  };
}

export function parseGwei(num: number | string): bigint {
  if (typeof num !== "number") {
    num = Number(num);
  }
  return parseUnits(num.toFixed(9), 9);
}
