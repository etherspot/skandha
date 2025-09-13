import { getEtherscanGasFee } from "./utils.js";
import { IGetGasFeeResult } from "./interfaces.js";

export async function getOpBnbGasFee(
  apiKey: string | undefined = undefined
): Promise<IGetGasFeeResult> {
  return getEtherscanGasFee("https://api-opbnb.bscscan.com/api", apiKey);
}
