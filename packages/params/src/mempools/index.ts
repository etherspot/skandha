import { IMempoolsConfig } from "../types";
import mumbaiMempools from "./mumbai";
import sepoliaMempools from "./sepolia";
import devMempools from "./dev";
import goerliMempools from "./goerli";

export const mempoolsConfig: IMempoolsConfig = {
  mumbai: mumbaiMempools,
  sepolia: sepoliaMempools,
  dev: devMempools,
  goerli: goerliMempools,
};
