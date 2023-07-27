export * from "./interfaces";
export * from "./utils";

import { NetworkName } from "types/lib";
import { getArbitrumGasFee } from "./arbitrum";
import { getMaticGasFee } from "./matic";
import { getMumbaiGasFee } from "./mumbai";
import { getOptimismGasFee } from "./optimism";
import { IOracle } from "./interfaces";

export const oracles: {
  [key in NetworkName]?: IOracle;
} = {
  matic: getMaticGasFee,
  mumbai: getMumbaiGasFee,
  optimism: getOptimismGasFee,
  arbitrum: getArbitrumGasFee,
};
