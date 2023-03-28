import {fromHexString as b} from "@chainsafe/ssz";
import {IBundlerNetworkConfig} from "./types";

export const maticNetworkConfig: IBundlerNetworkConfig = {
    CONFIG_NAME: "matic",
    CHAIN_ID: 1,
    ENTRY_POINT_CONTRACT: [b("0x0576a174D229E3cFA37253523E645A78A0C91B57")],
    MEMPOOL_IDS: [b("")]
};
