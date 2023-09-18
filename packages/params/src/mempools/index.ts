import { IMempoolsConfig } from "../types";
import mumbaiMempools from "./mumbai";
import sepoliaMempools from "./sepolia";
import devMempools from "./dev";
import goerliMempools from "./goerli";

export const mempoolsConfig: IMempoolsConfig = {
  80001: mumbaiMempools,
  11155111: sepoliaMempools,
  1337: devMempools,
  5: goerliMempools,
};
