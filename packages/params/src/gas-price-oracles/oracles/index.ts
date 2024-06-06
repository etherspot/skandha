export * from "./interfaces";
export * from "./utils";

import { getArbitrumGasFee } from "./arbitrum";
import { getMaticGasFee } from "./matic";
import { getMumbaiGasFee } from "./mumbai";
import { getOptimismGasFee } from "./optimism";
import { IOracle } from "./interfaces";
import { getMantleGasFee } from "./mantle";
import { getBaseGasFee } from "./base";
import { getAncient8GasFee } from "./ancient8";
import { getEthGasPrice } from "./eth_gasPrice";

export const oracles: {
  [chainId: number]: IOracle | IOracle[] | undefined;
} = {
  137: getMaticGasFee,
  80001: getMumbaiGasFee,
  10: [getOptimismGasFee, getEthGasPrice],
  42161: [getArbitrumGasFee, getEthGasPrice],
  5000: getMantleGasFee,
  5001: getMantleGasFee,
  8453: [getBaseGasFee, getEthGasPrice],
  888888888: getAncient8GasFee,
  59144: getEthGasPrice,
  5003: getMantleGasFee,
};
