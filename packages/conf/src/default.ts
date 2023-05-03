import {
  gnosisNetworkConfig,
  IBundlerNetworkConfig,
  maticNetworkConfig,
} from "./networks";
import {
  mainnetNetworkConfig,
  mumbaiNetworkConfig,
  goerliNetworkConfig,
} from "./networks";

export type NetworkName = "mainnet" | "gnosis" | "matic" | "goerli" | "mumbai";

export const networksConfig: Record<NetworkName, IBundlerNetworkConfig> = {
  mainnet: mainnetNetworkConfig,
  matic: maticNetworkConfig,
  mumbai: mumbaiNetworkConfig,
  goerli: goerliNetworkConfig,
  gnosis: gnosisNetworkConfig,
};
