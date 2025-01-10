import { IGetGasFeeResult, IOracle } from "./interfaces";
import { getEtherscanGasFee } from "./utils";

export const getScrollGasFee: IOracle = (
  apiKey: string | undefined
): Promise<IGetGasFeeResult> =>
  getEtherscanGasFee("https://api.scrollscan.com/api", apiKey);