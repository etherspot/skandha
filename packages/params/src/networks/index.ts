import { INetworkParams } from "./types";
import { mainnetNetworkConfig } from "./mainnet";
import { maticNetworkConfig } from "./matic";
import { mumbaiNetworkConfig } from "./mumbai";
import { goerliNetworkConfig } from "./goerli";
import { gnosisNetworkConfig } from "./gnosis";

export type NetworkName = "mainnet" | "gnosis" | "matic" | "goerli" | "mumbai";

export const networksConfig: Record<NetworkName, INetworkParams> = {
  mainnet: mainnetNetworkConfig,
  matic: maticNetworkConfig,
  mumbai: mumbaiNetworkConfig,
  goerli: goerliNetworkConfig,
  gnosis: gnosisNetworkConfig,
};
