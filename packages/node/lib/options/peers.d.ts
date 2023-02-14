import { IDiscv5DiscoveryInputOptions } from "@chainsafe/discv5";
export declare type PeerManagerOpts = {
    /** The target number of peers we would like to connect to. */
    targetPeers: number;
    /** The maximum number of peers we allow (exceptions for subnet peers) */
    maxPeers: number;
    /**
     * Delay the 1st query after starting discv5
     * See https://github.com/ChainSafe/lodestar/issues/3423
     */
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
//# sourceMappingURL=peers.d.ts.map