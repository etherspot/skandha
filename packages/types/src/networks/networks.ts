export type NetworkName =
  | "mainnet"
  | "xdai"
  | "bsc"
  | "bscTest"
  | "goerli"
  | "fantom"
  | "fantomTest"
  | "matic"
  | "mumbai"
  | "aurora"
  | "auroraTest"
  | "avalanche"
  | "fuji"
  | "optimism"
  | "arbitrum"
  | "moonbeam"
  | "moonbase"
  | "celo"
  | "celoTest"
  | "fuse"
  | "fuseSparknet"
  | "arbitrumNova"
  | "arbitrumNitro"
  | "neon"
  | "neonDevnet"
  | "optimismGoerli"
  | "dev"
  | "base"
  | "baseGoerli"
  | "sepolia"
  | "chiado"
  | "polygonzkevm"
  | "mantle"
  | "mantleTestnet"
  | "linea"
  | "lineaTestnet"
  | "scroll"
  | "scrollSepolia"
  | "scrollAlpha"
  | "flare"
  | "flareCoston"
  | "flareCoston2"
  | "bifrost"
  | "bifrostTestnet";

export const networkNames: NetworkName[] = [
  "mainnet",
  "xdai",
  "bsc",
  "bscTest",
  "goerli",
  "fantom",
  "fantomTest",
  "matic",
  "mumbai",
  "aurora",
  "auroraTest",
  "avalanche",
  "fuji",
  "optimism",
  "arbitrum",
  "moonbeam",
  "moonbase",
  "celo",
  "celoTest",
  "fuse",
  "fuseSparknet",
  "arbitrumNova",
  "arbitrumNitro",
  "neon",
  "neonDevnet",
  "optimismGoerli",
  "dev",
  "base",
  "baseGoerli",
  "sepolia",
  "chiado",
  "polygonzkevm",
  "mantle",
  "mantleTestnet",
  "linea",
  "lineaTestnet",
  "scroll",
  "scrollSepolia",
  "scrollAlpha",
  "flare",
  "flareCoston",
  "flareCoston2",
  "bifrost",
  "bifrostTestnet",
];

export const NETWORK_NAME_TO_CHAIN_ID: {
  [network in NetworkName]: number;
} = {
  mainnet: 1,
  xdai: 100,
  bsc: 56,
  bscTest: 97,
  goerli: 5,
  fantom: 250,
  fantomTest: 4002,
  matic: 137,
  mumbai: 80001,
  aurora: 1313161554,
  auroraTest: 1313161555,
  avalanche: 43114,
  fuji: 43113,
  optimism: 10,
  arbitrum: 42161,
  moonbeam: 1284,
  moonbase: 1287,
  celo: 42220,
  celoTest: 44787,
  fuse: 122,
  fuseSparknet: 123,
  arbitrumNova: 42170,
  arbitrumNitro: 421613,
  neon: 245022934,
  neonDevnet: 245022926,
  optimismGoerli: 420,
  dev: 1337,
  base: 8453,
  baseGoerli: 84531,
  sepolia: 11155111,
  chiado: 10200,
  polygonzkevm: 1442,
  mantle: 5000,
  mantleTestnet: 5001,
  linea: 59144,
  lineaTestnet: 59140,
  scroll: 534352,
  scrollSepolia: 534351,
  scrollAlpha: 534353,
  flare: 14,
  flareCoston: 16,
  flareCoston2: 114,
  bifrost: 3068,
  bifrostTestnet: 49088,
};
