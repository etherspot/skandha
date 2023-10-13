import { getAddress } from "ethers/lib/utils";
import { IWhitelistedEntity } from "../types/IWhitelistedEntities";

export const WhitelistedPaymasters: IWhitelistedEntity = {
  1: [
    // Stackup
    // https://docs.stackup.sh/docs/entity-addresses
    getAddress("0xE93ECa6595fe94091DC1af46aaC2A8b5D7990770"),
  ],
  137: [
    // Pimlico
    // https://docs.pimlico.io/reference/erc20-paymaster/contracts
    getAddress("0xa683b47e447De6c8A007d9e294e87B6Db333Eb18"),

    // Stackup
    // https://docs.stackup.sh/docs/entity-addresses
    getAddress("0x474Ea64BEdDE53aaD1084210BD60eeF2989bF80f"),
    getAddress("0xE93ECa6595fe94091DC1af46aaC2A8b5D7990770"),
    getAddress("0x3870419Ba2BBf0127060bCB37f69A1b1C090992B"),
  ],
  42161: [
    // Pimlico
    // https://docs.pimlico.io/reference/erc20-paymaster/contracts
    getAddress("0x49EE41bC335Fb36be46A17307dcFe536A3494644"),

    // Stackup
    // https://docs.stackup.sh/docs/entity-addresses
    getAddress("0xE93ECa6595fe94091DC1af46aaC2A8b5D7990770"),
  ],
  56: [
    // Stackup
    // https://docs.stackup.sh/docs/entity-addresses
    getAddress("0xE93ECa6595fe94091DC1af46aaC2A8b5D7990770"),
  ],
  // Optimism
  10: [
    // Stackup
    // https://docs.stackup.sh/docs/entity-addresses
    getAddress("0xE93ECa6595fe94091DC1af46aaC2A8b5D7990770"),

    // Testing
    getAddress("0x071Cdd89455eD5e8f09215709bf1fe6DB0ba8249"),
    getAddress("0x99fB8d618F52a42049776899D5c07241D344a8A4"),
    getAddress("0x3bE5380ec8cfe159f0525d16d11E9Baba516C40c"),
    getAddress("0x9102889001d0901b3d9123651d492e52ce772C6b"),
  ],
  100: [
    // Stackup
    // https://docs.stackup.sh/docs/entity-addresses
    getAddress("0xE93ECa6595fe94091DC1af46aaC2A8b5D7990770"),
  ],

  /* ====== TESTNETS ====== */
  5: [
    // Pimlico
    // https://docs.pimlico.io/reference/erc20-paymaster/contracts
    getAddress("0xEc43912D8C772A0Eba5a27ea5804Ba14ab502009"),

    // Stackup
    // https://docs.stackup.sh/docs/entity-addresses
    getAddress("0xE93ECa6595fe94091DC1af46aaC2A8b5D7990770"),
    getAddress("0x3870419Ba2BBf0127060bCB37f69A1b1C090992B"),
  ],
  80001: [
    // Pimlico
    // https://docs.pimlico.io/reference/erc20-paymaster/contracts
    getAddress("0x32aCDFeA07a614E52403d2c1feB747aa8079A353"),

    // Stackup
    // https://docs.stackup.sh/docs/entity-addresses
    getAddress("0xE93ECa6595fe94091DC1af46aaC2A8b5D7990770"),
    getAddress("0x3870419Ba2BBf0127060bCB37f69A1b1C090992B"),
  ],
  84531: [
    // Pimlico
    // https://docs.pimlico.io/reference/erc20-paymaster/contracts
    getAddress("0x13f490FafBb206440F25760A10C21A6220017fFa"),

    // Stackup
    // https://docs.stackup.sh/docs/entity-addresses
    getAddress("0xE93ECa6595fe94091DC1af46aaC2A8b5D7990770"),
    getAddress("0x3870419Ba2BBf0127060bCB37f69A1b1C090992B"),
  ],
  97: [
    // Stackup
    // https://docs.stackup.sh/docs/entity-addresses
    getAddress("0xE93ECa6595fe94091DC1af46aaC2A8b5D7990770"),
    getAddress("0x3870419Ba2BBf0127060bCB37f69A1b1C090992B"),
  ],
  // Optimism Goerli
  420: [
    // Stackup
    // https://docs.stackup.sh/docs/entity-addresses
    getAddress("0xE93ECa6595fe94091DC1af46aaC2A8b5D7990770"),
    getAddress("0x3870419Ba2BBf0127060bCB37f69A1b1C090992B"),

    // Testing
    getAddress("0x53F48579309f8dBfFE4edE921C50200861C2482a"),
  ],
  11155111: [
    // Stackup
    // https://docs.stackup.sh/docs/entity-addresses
    getAddress("0xE93ECa6595fe94091DC1af46aaC2A8b5D7990770"),
    getAddress("0x3870419Ba2BBf0127060bCB37f69A1b1C090992B"),
  ],
  // Arbitrum
  421613: [
    // Stackup
    // https://docs.stackup.sh/docs/entity-addresses
    getAddress("0xE93ECa6595fe94091DC1af46aaC2A8b5D7990770"),
    getAddress("0x3870419Ba2BBf0127060bCB37f69A1b1C090992B"),

    // Testing
    getAddress("0x0a6Aa1Bd30D6954cA525315287AdeeEcbb6eFB59"),
  ],
};
