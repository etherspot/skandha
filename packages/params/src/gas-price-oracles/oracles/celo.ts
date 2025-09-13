import { getEtherscanGasFee } from "./utils.js";
import { IGetGasFeeResult } from "./interfaces.js";

export async function getCeloGasFee(
  apiKey: string | undefined = undefined
): Promise<IGetGasFeeResult> {
  return getEtherscanGasFee("https://api.celoscan.io/api", apiKey);
}
