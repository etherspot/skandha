import { getEtherscanGasFee } from "./utils";
import { IGetGasFeeResult } from "./interfaces";

export async function getOpBnbGasFee(
  apiKey: string | undefined = undefined
): Promise<IGetGasFeeResult> {
  return getEtherscanGasFee("https://api-opbnb.bscscan.com/api", apiKey);
}
