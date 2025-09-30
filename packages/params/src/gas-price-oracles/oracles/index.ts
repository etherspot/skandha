export * from "./interfaces.js";
export * from "./utils.js";

import { getArbitrumGasFee } from "./arbitrum.js";
import { getMaticGasFee } from "./matic.js";
import { getMumbaiGasFee } from "./mumbai.js";
import { getOptimismGasFee } from "./optimism.js";
import { IOracle } from "./interfaces.js";
import { getMantleGasFee } from "./mantle.js";
import { getBaseGasFee } from "./base.js";
import { getAncient8GasFee } from "./ancient8.js";
import { getAmoyGasFee } from "./amoy.js";
import { getEthGasPrice } from "./eth_gasPrice.js";
import { getScrollGasFee } from "./scroll.js";
import { getCeloGasFee } from "./celo.js";
import { getOpBnbGasFee } from "./opbnb.js";

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
  80002: getAmoyGasFee,
  534352: getScrollGasFee,
  42220: getCeloGasFee,
  204: getOpBnbGasFee,
};
