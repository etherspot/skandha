import { getAddress } from "ethers/lib/utils";
import { IWhitelistedEntity } from "../types/IWhitelistedEntities";

export const WhitelistedPaymasters: IWhitelistedEntity = {
  mainnet: [
    // Stackup
    // https://docs.stackup.sh/docs/entity-addresses
    getAddress("0xE93ECa6595fe94091DC1af46aaC2A8b5D7990770"),
  ],
  matic: [
    // Pimlico
    // https://docs.pimlico.io/reference/erc20-paymaster/contracts
    getAddress("0xa683b47e447De6c8A007d9e294e87B6Db333Eb18"),

    // Stackup
    // https://docs.stackup.sh/docs/entity-addresses
    getAddress("0x474Ea64BEdDE53aaD1084210BD60eeF2989bF80f"),
    getAddress("0xE93ECa6595fe94091DC1af46aaC2A8b5D7990770"),
    getAddress("0x3870419Ba2BBf0127060bCB37f69A1b1C090992B"),
  ],
  arbitrum: [
    // Pimlico
    // https://docs.pimlico.io/reference/erc20-paymaster/contracts
    getAddress("0x49EE41bC335Fb36be46A17307dcFe536A3494644"),

    // Stackup
    // https://docs.stackup.sh/docs/entity-addresses
    getAddress("0xE93ECa6595fe94091DC1af46aaC2A8b5D7990770"),
  ],
  bsc: [
    // Stackup
    // https://docs.stackup.sh/docs/entity-addresses
    getAddress("0xE93ECa6595fe94091DC1af46aaC2A8b5D7990770"),
  ],
  optimism: [
    // Stackup
    // https://docs.stackup.sh/docs/entity-addresses
    getAddress("0xE93ECa6595fe94091DC1af46aaC2A8b5D7990770"),
  ],
  xdai: [
    // Stackup
    // https://docs.stackup.sh/docs/entity-addresses
    getAddress("0xE93ECa6595fe94091DC1af46aaC2A8b5D7990770"),
  ],

  /* ====== TESTNETS ====== */
  goerli: [
    // Pimlico
    // https://docs.pimlico.io/reference/erc20-paymaster/contracts
    getAddress("0xEc43912D8C772A0Eba5a27ea5804Ba14ab502009"),

    // Stackup
    // https://docs.stackup.sh/docs/entity-addresses
    getAddress("0xE93ECa6595fe94091DC1af46aaC2A8b5D7990770"),
    getAddress("0x3870419Ba2BBf0127060bCB37f69A1b1C090992B"),
  ],
  mumbai: [
    // Pimlico
    // https://docs.pimlico.io/reference/erc20-paymaster/contracts
    getAddress("0x32aCDFeA07a614E52403d2c1feB747aa8079A353"),

    // Stackup
    // https://docs.stackup.sh/docs/entity-addresses
    getAddress("0xE93ECa6595fe94091DC1af46aaC2A8b5D7990770"),
    getAddress("0x3870419Ba2BBf0127060bCB37f69A1b1C090992B"),
  ],
  baseGoerli: [
    // Pimlico
    // https://docs.pimlico.io/reference/erc20-paymaster/contracts
    getAddress("0x13f490FafBb206440F25760A10C21A6220017fFa"),

    // Stackup
    // https://docs.stackup.sh/docs/entity-addresses
    getAddress("0xE93ECa6595fe94091DC1af46aaC2A8b5D7990770"),
    getAddress("0x3870419Ba2BBf0127060bCB37f69A1b1C090992B"),
  ],
  bscTest: [
    // Stackup
    // https://docs.stackup.sh/docs/entity-addresses
    getAddress("0xE93ECa6595fe94091DC1af46aaC2A8b5D7990770"),
    getAddress("0x3870419Ba2BBf0127060bCB37f69A1b1C090992B"),
  ],
  optimismGoerli: [
    // Stackup
    // https://docs.stackup.sh/docs/entity-addresses
    getAddress("0xE93ECa6595fe94091DC1af46aaC2A8b5D7990770"),
    getAddress("0x3870419Ba2BBf0127060bCB37f69A1b1C090992B"),
  ],
  sepolia: [
    // Stackup
    // https://docs.stackup.sh/docs/entity-addresses
    getAddress("0xE93ECa6595fe94091DC1af46aaC2A8b5D7990770"),
    getAddress("0x3870419Ba2BBf0127060bCB37f69A1b1C090992B"),
  ],
  arbitrumNitro: [
    // Stackup
    // https://docs.stackup.sh/docs/entity-addresses
    getAddress("0xE93ECa6595fe94091DC1af46aaC2A8b5D7990770"),
    getAddress("0x3870419Ba2BBf0127060bCB37f69A1b1C090992B"),
  ],
};
