import { fromHexString as b } from "@chainsafe/ssz";
import { NETWORK_NAME_TO_CHAIN_ID } from "types/lib";
import { INetworkParams } from "./types";

export const goerliNetworkConfig: INetworkParams = {
  CONFIG_NAME: "goerli",
  CHAIN_ID: NETWORK_NAME_TO_CHAIN_ID["goerli"],
  ENTRY_POINT_CONTRACT: [b("0x0576a174D229E3cFA37253523E645A78A0C91B57")],
  MEMPOOL_IDS: [b("")],
};
