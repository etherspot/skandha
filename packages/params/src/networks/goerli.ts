import { fromHexString as b } from "@chainsafe/ssz";
import { INetworkParams } from "../types";
import { serializeMempoolId } from "../utils";

export const goerliNetworkConfig: INetworkParams = {
  CHAIN_ID: 5,
  ENTRY_POINT_CONTRACT: [b("0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789")],
  CANONICAL_MEMPOOL: serializeMempoolId(
    "QmTmj4cizhWpEFCCqk5dP67yws7R2PPgCtb2bd2RgVPCbF"
  ),
};
