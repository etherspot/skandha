import { IDiscv5DiscoveryInputOptions } from "@chainsafe/discv5";

export type PeerManagerOpts = {
  /** The target number of peers we would like to connect to. */
  targetPeers: number;
  /** The maximum number of peers we allow */
  maxPeers: number;
  discv5FirstQueryDelayMs: number;
  /**
   * If null, Don't run discv5 queries, nor connect to cached peers in the peerStore
   */
  discv5: IDiscv5DiscoveryInputOptions | null;
  /**
   * If set to true, connect to Discv5 bootnodes. If not set or false, do not connect
   */
  connectToDiscv5Bootnodes?: boolean;
};
