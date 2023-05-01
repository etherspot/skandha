export type IBundlerNetworkConfig = {
  CONFIG_NAME: string;

  // chainId
  CHAIN_ID: number;

  // entrypoint contract address
  ENTRY_POINT_CONTRACT: [Uint8Array];

  // mempool ids
  MEMPOOL_IDS: [Uint8Array];
};
