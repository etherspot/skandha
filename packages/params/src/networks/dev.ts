import { fromHexString as b } from "@chainsafe/ssz";
import { NETWORK_NAME_TO_CHAIN_ID } from "types/lib";
import { serializeMempoolId } from "../utils";
import { INetworkParams } from "./types";

export const devNetworkConfig: INetworkParams = {
  CONFIG_NAME: "dev",
  CHAIN_ID: NETWORK_NAME_TO_CHAIN_ID["dev"],
  ENTRY_POINT_CONTRACT: [b("0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789")],
  MEMPOOL_IDS: [
    serializeMempoolId("Qmf7P3CuhzSbpJa8LqXPwRzfPqsvoQ6RG7aXvthYTzGxb2"),
  ],
};

export const sepoliaNetworkConfig: INetworkParams = {
  CONFIG_NAME: "sepolia",
  CHAIN_ID: NETWORK_NAME_TO_CHAIN_ID["sepolia"],
  ENTRY_POINT_CONTRACT: [b("0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789")],
  MEMPOOL_IDS: [
    serializeMempoolId("QmPjLZLgwocemJMQ2wHyWF97vyJ8cgnfWjAMR7EV26Yeoj"),
  ],
};
