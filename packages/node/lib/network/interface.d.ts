import { Libp2p as ILibp2p } from "libp2p";
import { Connection } from "@libp2p/interface-connection";
import { Multiaddr } from "@multiformats/multiaddr";
import { PeerId } from "@libp2p/interface-peer-id";
import * as ts from "types/lib/types";
import { SignableENR } from "@chainsafe/discv5";
import { INetworkEventBus } from "./events";
import { MetadataController } from "./metadata";
import { ConnectionManager } from "@libp2p/interface-connection-manager";
import { Registrar } from "@libp2p/interface-registrar";
export interface INetwork {
    events: INetworkEventBus;
    metadata: MetadataController;
    gossip: any;
    reqResp: any;
    syncService: any;
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
export declare type Libp2p = ILibp2p & {
    connectionManager: ConnectionManager;
    registrar: Registrar;
};
//# sourceMappingURL=interface.d.ts.map