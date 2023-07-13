import { IMempoolsConfig } from "../types";
import mumbaiMempools from "./mumbai";
import sepoliaMempools from "./sepolia";
import devMempools from "./dev";

export const mempoolsConfig: IMempoolsConfig = {
  mumbai: mumbaiMempools,
  sepolia: sepoliaMempools,
  dev: devMempools,
};
