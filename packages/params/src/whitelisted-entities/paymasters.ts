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
  // Arbitrum
  42161: [
    // Pimlico
    // https://docs.pimlico.io/reference/erc20-paymaster/contracts
    getAddress("0x49EE41bC335Fb36be46A17307dcFe536A3494644"),

    // Stackup
    // https://docs.stackup.sh/docs/entity-addresses
    getAddress("0xE93ECa6595fe94091DC1af46aaC2A8b5D7990770"),

    // Testing
    getAddress("0xA1748d4A93e361e186B7bC19a733f79601315aDe"),
    getAddress("0xB55B04045fA72374bF94FCB32cDd63bD81cC4b07"),
    getAddress("0x667d2fc02c34a557A87EC7F62FeAe3CA2BabD5d3"),
    getAddress("0xde07AF31A650cd77c5F2A69501e7d90c4836F660"),
    getAddress("0xE0221Db5bF2F3C22d6639a749B764f52f5B05dfb"),
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
    getAddress("0x875329626E55Cc890b6444b497B1E369f45379F9"),
    getAddress("0xD5FD5b4AeF90055a55Dd97A3cCA10c18A653E16b"),
    getAddress("0xC016585AbCdBD09AB2b9E1C782486B06b8bbEeF7"),
    getAddress("0x950BD6AF4EEe695c1Be4D4335E8710B511356e59"),
  ],
  100: [
    // Stackup
    // https://docs.stackup.sh/docs/entity-addresses
    getAddress("0xE93ECa6595fe94091DC1af46aaC2A8b5D7990770"),
  ],
  // Flare
  14: [
    // eUSDT
    getAddress("0x6Bb048981E67f1a0aD41c0BD05635244d3ADaA2c"),
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
  // Arbitrum testnet
  421613: [
    // Stackup
    // https://docs.stackup.sh/docs/entity-addresses
    getAddress("0xE93ECa6595fe94091DC1af46aaC2A8b5D7990770"),
    getAddress("0x3870419Ba2BBf0127060bCB37f69A1b1C090992B"),

    // Testing
    getAddress("0x0a6Aa1Bd30D6954cA525315287AdeeEcbb6eFB59"),
  ],
  // Coston 2
  114: [
    // USDC/ETH
    getAddress("0x8b067387ec0B922483Eadb771bc9290194685522"),
  ],

  // Mantle testnet
  5001: [getAddress("0x6Ea25cbb60360243E871dD935225A293a78704a8")],
};
