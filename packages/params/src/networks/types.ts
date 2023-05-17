import { NetworkName } from "types/lib";

export type INetworkParams = {
  CONFIG_NAME: NetworkName;

  // chainId
  CHAIN_ID: number;

  // entrypoint contract address
  ENTRY_POINT_CONTRACT: [Uint8Array];

  // mempool ids
  MEMPOOL_IDS: [Uint8Array];
};
