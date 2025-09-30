import { IGetGasFeeResult, IOracle } from "./interfaces.js";
import { getEtherscanGasFee } from "./utils.js";

export const getArbitrumGasFee: IOracle = (
  apiKey: string | undefined
): Promise<IGetGasFeeResult> =>
  getEtherscanGasFee("https://api.arbiscan.io/api", apiKey);
