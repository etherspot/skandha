import { getEtherscanGasFee } from "./utils";
import { IGetGasFeeResult } from "./interfaces";

export async function getCeloGasFee(
  apiKey: string | undefined = undefined
): Promise<IGetGasFeeResult> {
  return getEtherscanGasFee("https://api.celoscan.io/api", apiKey);
}
