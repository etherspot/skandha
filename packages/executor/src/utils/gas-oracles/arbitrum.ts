import { IGetGasFeeResult, IOracle } from "./interfaces";
import { getEtherscanGasFee } from "./utils";

export const getArbitrumGasFee: IOracle = (
  apiKey: string | undefined
): Promise<IGetGasFeeResult> =>
  getEtherscanGasFee("https://api-goerli.arbiscan.io/api", apiKey);
