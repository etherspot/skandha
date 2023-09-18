import { INetworkParams } from "../types";
import { mainnetNetworkConfig } from "./mainnet";
import { maticNetworkConfig } from "./matic";
import { mumbaiNetworkConfig } from "./mumbai";
import { goerliNetworkConfig } from "./goerli";
import { xdaiNetworkConfig } from "./xdai";
import { sepoliaNetworkConfig } from "./sepolia";
import { devNetworkConfig } from "./dev";

export const networksConfig: Partial<Record<number, INetworkParams>> = {
  1: mainnetNetworkConfig,
  137: maticNetworkConfig,
  80001: mumbaiNetworkConfig,
  5: goerliNetworkConfig,
  100: xdaiNetworkConfig,
  11155111: sepoliaNetworkConfig,
  1337: devNetworkConfig,
};
