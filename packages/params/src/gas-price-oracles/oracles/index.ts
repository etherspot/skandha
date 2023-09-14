export * from "./interfaces";
export * from "./utils";

import { NetworkName } from "types/lib";
import { getArbitrumGasFee } from "./arbitrum";
import { getMaticGasFee } from "./matic";
import { getMumbaiGasFee } from "./mumbai";
import { getOptimismGasFee } from "./optimism";
import { IOracle } from "./interfaces";
import { getMantleGasFee } from "./mantle";

export const oracles: {
  [key in NetworkName]?: IOracle;
} = {
  matic: getMaticGasFee,
  mumbai: getMumbaiGasFee,
  optimism: getOptimismGasFee,
  arbitrum: getArbitrumGasFee,
  mantle: getMantleGasFee,
  mantleTestnet: getMantleGasFee,
};
