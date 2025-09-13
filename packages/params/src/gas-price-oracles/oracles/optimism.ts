import { IGetGasFeeResult, IOracle } from "./interfaces.js";
import { getEtherscanGasFee } from "./utils.js";

export const getOptimismGasFee: IOracle = (
  apiKey: string | undefined
): Promise<IGetGasFeeResult> =>
  getEtherscanGasFee("https://api-optimistic.etherscan.io/api", apiKey);
