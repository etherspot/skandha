export type INetworkParams = {
  // chainId
  CHAIN_ID: number;

  // entrypoint contract address
  ENTRY_POINT_CONTRACT: Uint8Array[];

  CANONICAL_MEMPOOL?: Uint8Array;
};

export type IMempoolParams = {
  entrypoint: string;
};

export type IMempoolsConfig = Partial<
  Record<number, Record<string, IMempoolParams>>
>;
