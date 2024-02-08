import { fromHexString as b } from "@chainsafe/ssz";
import { INetworkParams } from "../types";

export const xdaiNetworkConfig: INetworkParams = {
  CHAIN_ID: 100,
  ENTRY_POINT_CONTRACT: [b("0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789")],
};
