import { fromHexString as b } from "@chainsafe/ssz";
import { NETWORK_NAME_TO_CHAIN_ID } from "types/lib";
import { serializeMempoolId } from "../utils";
import { INetworkParams } from "./types";

export const devNetworkConfig: INetworkParams = {
  CONFIG_NAME: "dev",
  CHAIN_ID: NETWORK_NAME_TO_CHAIN_ID["dev"],
  ENTRY_POINT_CONTRACT: [b("0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789")],
  MEMPOOL_IDS: [
    serializeMempoolId("DevDevDevDevDevDevDevDevDevDevDevDevDevERC4337"),
  ],
};
