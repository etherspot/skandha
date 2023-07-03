import { NetworkName } from "types/lib";
import { INetworkParams } from "../types";
import { mainnetNetworkConfig } from "./mainnet";
import { maticNetworkConfig } from "./matic";
import { mumbaiNetworkConfig } from "./mumbai";
import { goerliNetworkConfig } from "./goerli";
import { xdaiNetworkConfig } from "./xdai";
import { sepoliaNetworkConfig } from "./sepolia";
import { devNetworkConfig } from "./dev";

export const networksConfig: Partial<Record<NetworkName, INetworkParams>> = {
  mainnet: mainnetNetworkConfig,
  matic: maticNetworkConfig,
  mumbai: mumbaiNetworkConfig,
  goerli: goerliNetworkConfig,
  xdai: xdaiNetworkConfig,
  sepolia: sepoliaNetworkConfig,
  dev: devNetworkConfig,
};
