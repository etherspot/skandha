import { constants } from "ethers";
import { StakeInfo } from "../src/interfaces";

export const TestAccountMnemonic =
  "test test test test test test test test test test test junk";
export const EntryPointAddress = "0x9b5d240EF1bc8B4930346599cDDFfBD7d7D56db9";
export const SimpleFactoryAddress =
  "0xE759fdEAC26252feFd31a044493154ABDd709344";
export const DefaultRpcUrl = "http://127.0.0.1:8545";
export const NetworkName = "anvil";
export const ChainId = 31337;
export const ZeroStakeInfo: StakeInfo = {
  addr: constants.AddressZero,
  stake: constants.Zero,
  unstakeDelaySec: constants.Zero,
};
