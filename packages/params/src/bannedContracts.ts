import { NetworkName } from "types/lib/networks";

export const BannedContracts: {
  [name in NetworkName]?: string[];
} = {
  // https://doc.aurora.dev/evm/precompiles/#random-seed
  aurora: ["0xc104f4840573bed437190daf5d2898c2bdf928ac"], // randomseed
  auroraTest: ["0xc104f4840573bed437190daf5d2898c2bdf928ac"], // randomseed

  // https://docs.moonbeam.network/builders/pallets-precompiles/precompiles/randomness/
  moonbeam: ["0x0000000000000000000000000000000000000809"], // randomness
  moonbase: ["0x0000000000000000000000000000000000000809"], // randomness

  // https://developer.arbitrum.io/arbos/precompiles
  arbitrum: [
    "0x6c", // Info about gas pricing
    "0x6b", // Info about chain owners
    "0xff", // Testing tools
    "0x6f", // 	Info about the pre-Nitro state
    "0x64", // System-level functionality
  ],

  // https://github.com/ethereum-optimism/optimism/blob/develop/specs/predeploys.md
  optimism: [
    "0x4200000000000000000000000000000000000013", // L1BlockNumber
    "0x420000000000000000000000000000000000000F", // GasPriceOracle
    "0x4200000000000000000000000000000000000015", // L1Block
  ],
  optimismGoerli: [
    "0x4200000000000000000000000000000000000013", // L1BlockNumber
    "0x420000000000000000000000000000000000000F", // GasPriceOracle
    "0x4200000000000000000000000000000000000015", // L1Block
  ],
};
