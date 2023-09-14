import { IGetGasFeeResult, IOracle } from "./interfaces";
import { getEtherscanGasFee } from "./utils";

export const getOptimismGasFee: IOracle = (
  apiKey: string | undefined
): Promise<IGetGasFeeResult> =>
  getEtherscanGasFee("https://api-optimistic.etherscan.io/api", apiKey);
