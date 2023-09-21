import { fromHexString as b } from "@chainsafe/ssz";
import { INetworkParams } from "../types";

export const maticNetworkConfig: INetworkParams = {
  CONFIG_NAME: "matic",
  CHAIN_ID: 137,
  ENTRY_POINT_CONTRACT: [b("0x0576a174D229E3cFA37253523E645A78A0C91B57")],
  MEMPOOL_IDS: [b("")],
};
