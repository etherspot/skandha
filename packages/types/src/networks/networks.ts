export type NetworkName =
  | "mainnet"
  | "dev"
  | "gnosis"
  | "goerli"
  | "mumbai"
  | "arbitrumNitro"
  | "etherspot";

export const networkNames: NetworkName[] = [
  "mainnet",
  "gnosis",
  "goerli",
  "mumbai",
  "arbitrumNitro",
  "etherspot",
  // Leave always as last network. The order matters for the --help printout
  "dev",
];

export const NETWORK_NAME_TO_CHAIN_ID: {
  [network: string]: number;
} = {
  mainnet: 1,
  gnosis: 100,
  goerli: 5,
  mumbai: 80001,
  arbitrumNitro: 421613,
  dev: 1337,
  etherspot: 4386,
};
