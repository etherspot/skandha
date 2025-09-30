import { IGetGasFeeResult, IOracle } from "./interfaces.js";
import { getEtherscanGasFee } from "./utils.js";

export const getBaseGasFee: IOracle = (
  apiKey: string | undefined
): Promise<IGetGasFeeResult> =>
  getEtherscanGasFee("https://api.basescan.org/api", apiKey);
