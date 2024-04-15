import { constants } from "ethers";
import { StakeInfo } from "../src/interfaces";

export const TestAccountMnemonic = "test test test test test test test test test test test junk";
export const EntryPointAddress = "0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789";
export const SimpleFactoryAddress = "0x6Cf2534C6AA425F20fb6A15FC836C8DD7e8f14e3";
export const DefaultRpcUrl = "http://127.0.0.1:8545";
export const NetworkName = "anvil";
export const ChainId = 31337;
export const ZeroStakeInfo: StakeInfo = {
  addr: constants.AddressZero,
  stake: constants.Zero,
  unstakeDelaySec: constants.Zero
}
