import { IGetGasFeeResult, IOracle } from "./interfaces.js";
import { getEtherscanGasFee } from "./utils.js";

export const getAmoyGasFee: IOracle = (
  apiKey: string | undefined
): Promise<IGetGasFeeResult> =>
  getEtherscanGasFee("https://api-amoy.polygonscan.com/api", apiKey);
