import { fromHexString as b } from "@chainsafe/ssz";
import { NETWORK_NAME_TO_CHAIN_ID } from "types/lib";
import { serializeMempoolId } from "../utils";
import { INetworkParams } from "../types";

export const mumbaiNetworkConfig: INetworkParams = {
  CONFIG_NAME: "mumbai",
  CHAIN_ID: NETWORK_NAME_TO_CHAIN_ID["mumbai"],
  ENTRY_POINT_CONTRACT: [b("0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789")],
  MEMPOOL_IDS: [
    serializeMempoolId("QmcFZKUX9qoo3StwVycJTAhwdiqbEjcwNvQVK246p3z1rk"),
  ],
};
