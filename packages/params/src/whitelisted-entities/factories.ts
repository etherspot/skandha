import { getAddress } from "ethers/lib/utils";
import { IWhitelistedEntity } from "../types/IWhitelistedEntities";

export const WhitelistedFactories: IWhitelistedEntity = {
  // Etherspot Paymasters
  // ref: https://github.com/etherspot/etherspot-prime-contracts/blob/master/DEPLOYMENTS.md
  mainnet: [getAddress("0x7f6d8F107fE8551160BD5351d5F1514A6aD5d40E")],
  arbitrum: [getAddress("0x7f6d8F107fE8551160BD5351d5F1514A6aD5d40E")],
  optimism: [getAddress("0x7f6d8F107fE8551160BD5351d5F1514A6aD5d40E")],
  matic: [getAddress("0x7f6d8F107fE8551160BD5351d5F1514A6aD5d40E")],
  fuse: [getAddress("0x7f6d8F107fE8551160BD5351d5F1514A6aD5d40E")],
  xdai: [getAddress("0x7f6d8F107fE8551160BD5351d5F1514A6aD5d40E")],
  mantle: [getAddress("0x7f6d8F107fE8551160BD5351d5F1514A6aD5d40E")],
  avalanche: [getAddress("0x7f6d8F107fE8551160BD5351d5F1514A6aD5d40E")],
  bsc: [getAddress("0x7f6d8F107fE8551160BD5351d5F1514A6aD5d40E")],
  base: [getAddress("0x7f6d8F107fE8551160BD5351d5F1514A6aD5d40E")],
  linea: [getAddress("0x7f6d8F107fE8551160BD5351d5F1514A6aD5d40E")],
  goerli: [getAddress("0x7f6d8F107fE8551160BD5351d5F1514A6aD5d40E")],
  sepolia: [getAddress("0x7f6d8F107fE8551160BD5351d5F1514A6aD5d40E")],
  arbitrumNitro: [getAddress("0x7f6d8F107fE8551160BD5351d5F1514A6aD5d40E")],
  optimismGoerli: [getAddress("0x7f6d8F107fE8551160BD5351d5F1514A6aD5d40E")],
  mumbai: [getAddress("0x7f6d8F107fE8551160BD5351d5F1514A6aD5d40E")],
  fuseSparknet: [getAddress("0x7f6d8F107fE8551160BD5351d5F1514A6aD5d40E")],
  baseGoerli: [getAddress("0x7f6d8F107fE8551160BD5351d5F1514A6aD5d40E")],
  chiado: [getAddress("0x7f6d8F107fE8551160BD5351d5F1514A6aD5d40E")],
  fuji: [getAddress("0x7f6d8F107fE8551160BD5351d5F1514A6aD5d40E")],
  bscTest: [getAddress("0x7f6d8F107fE8551160BD5351d5F1514A6aD5d40E")],
  lineaTestnet: [getAddress("0x7f6d8F107fE8551160BD5351d5F1514A6aD5d40E")],
  scrollSepolia: [getAddress("0x7f6d8F107fE8551160BD5351d5F1514A6aD5d40E")],
  mantleTestnet: [getAddress("0x7f6d8F107fE8551160BD5351d5F1514A6aD5d40E")],
  flare: [getAddress("0x7f6d8F107fE8551160BD5351d5F1514A6aD5d40E")],
  flareCoston: [getAddress("0x7f6d8F107fE8551160BD5351d5F1514A6aD5d40E")],
  flareCoston2: [getAddress("0x7f6d8F107fE8551160BD5351d5F1514A6aD5d40E")],
};
