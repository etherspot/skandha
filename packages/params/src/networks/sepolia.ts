import { fromHexString as b } from "@chainsafe/ssz";
import { serializeMempoolId } from "../utils";
import { INetworkParams } from "../types";

export const sepoliaNetworkConfig: INetworkParams = {
  CHAIN_ID: 11155111,
  ENTRY_POINT_CONTRACT: [b("0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789")],
  CANONICAL_MEMPOOL: serializeMempoolId(
    "QmPjLZLgwocemJMQ2wHyWF97vyJ8cgnfWjAMR7EV26Yeoj"
  ),
};
