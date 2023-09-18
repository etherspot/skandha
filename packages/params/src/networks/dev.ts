import { fromHexString as b } from "@chainsafe/ssz";
import { serializeMempoolId } from "../utils";
import { INetworkParams } from "../types";

export const devNetworkConfig: INetworkParams = {
  CONFIG_NAME: "dev",
  CHAIN_ID: 1337,
  ENTRY_POINT_CONTRACT: [b("0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789")],
  MEMPOOL_IDS: [
    serializeMempoolId("Qmf7P3CuhzSbpJa8LqXPwRzfPqsvoQ6RG7aXvthYTzGxb2"),
  ],
};
