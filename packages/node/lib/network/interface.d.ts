import { Connection } from "@libp2p/interface-connection";
import { Multiaddr } from "@multiformats/multiaddr";
import { PeerId } from "@libp2p/interface-peer-id";
import * as ts from "types/lib/types";
import { SignableENR } from "@chainsafe/discv5";
export interface INetwork {
    events: any;
    gossip: any;
    reqResp: any;
    metadata: any;
    /** Our network identity */
    peerId: PeerId;
    localMultiaddrs: Multiaddr[];
    getEnr(): Promise<SignableENR | undefined>;
    getConnectionsByPeer(): Map<string, Connection[]>;
    getConnectedPeers(): PeerId[];
    hasSomeConnectedPeer(): boolean;
    publishUserOp(userOp: ts.UserOp): Promise<void>;
    subscribeGossipCoreTopics(): void;
    unsubscribeGossipCoreTopics(): void;
    isSubscribedToGossipCoreTopics(): boolean;
    start(): Promise<void>;
    stop(): Promise<void>;
    close(): void;
    connectToPeer(peer: PeerId, multiaddr: Multiaddr[]): Promise<void>;
    disconnectPeer(peer: PeerId): Promise<void>;
    getAgentVersion(peerIdStr: string): string;
}
//# sourceMappingURL=interface.d.ts.map