import { IGetGasFeeResult, IOracle } from "./interfaces.js";
import { getEtherscanGasFee } from "./utils.js";

export const getScrollGasFee: IOracle = (
  apiKey: string | undefined
): Promise<IGetGasFeeResult> =>
  getEtherscanGasFee("https://api.scrollscan.com/api", apiKey);
