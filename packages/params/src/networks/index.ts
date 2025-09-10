import { INetworkParams } from "../types/index.js";
import { mainnetNetworkConfig } from "./mainnet.js";
import { maticNetworkConfig } from "./matic.js";
import { mumbaiNetworkConfig } from "./mumbai.js";
import { goerliNetworkConfig } from "./goerli.js";
import { xdaiNetworkConfig } from "./xdai.js";
import { sepoliaNetworkConfig } from "./sepolia.js";
import { devNetworkConfig } from "./dev.js";

export const networksConfig: Partial<Record<number, INetworkParams>> = {
  1: mainnetNetworkConfig,
  137: maticNetworkConfig,
  80001: mumbaiNetworkConfig,
  5: goerliNetworkConfig,
  100: xdaiNetworkConfig,
  11155111: sepoliaNetworkConfig,
  1337: devNetworkConfig,
};
