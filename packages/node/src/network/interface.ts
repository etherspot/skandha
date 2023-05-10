import { Libp2p as ILibp2p } from "libp2p";
import { Connection } from "@libp2p/interface-connection";
import { Multiaddr } from "@multiformats/multiaddr";
import { PeerId } from "@libp2p/interface-peer-id";
// eslint-disable-next-line import/namespace
import { ts } from "types/lib";
import { SignableENR } from "@chainsafe/discv5";
import type { ConnectionManager } from "@libp2p/interface-connection-manager";
import type { Registrar } from "@libp2p/interface-registrar";
import { Logger } from "api/lib/logger";
import { INetworkEventBus } from "./events";
import { MetadataController } from "./metadata";
import { BundlerGossipsub } from "./gossip";
import { ReqRespNode } from "./reqresp/ReqRespNode";

export type PeerSearchOptions = {
  supportsProtocols?: string[];
  count?: number;
};

export interface INetwork {
  events: INetworkEventBus;
  metadata: MetadataController;
  gossip: BundlerGossipsub;
  reqResp: ReqRespNode; //TODO - Define the class for reqResp
  logger: Logger;

  /** Our network identity */
  peerId: PeerId;
  localMultiaddrs: Multiaddr[];
  getEnr(): Promise<SignableENR | undefined>;
  getConnectionsByPeer(): Map<string, Connection[]>;
  getConnectedPeers(): PeerId[];
  getConnectedPeerCount(): number;

  /* List of p2p functions supported by Bundler */
  publishUserOpWithEntryPoint(userOp: ts.UserOpWithEntryPoint): Promise<void>;

  //Gossip handler
  subscribeGossipCoreTopics(mempool: string): void;
  unsubscribeGossipCoreTopics(mempool: string): void;
  isSubscribedToGossipCoreTopics(mempool: string): boolean;

  // Service
  start(): Promise<void>;
  stop(): Promise<void>;
  close(): void;

  // Debug
  connectToPeer(peer: PeerId, multiaddr: Multiaddr[]): Promise<void>;
  disconnectPeer(peer: PeerId): Promise<void>;
  getAgentVersion(peerIdStr: string): string;
}

export type PeerDirection = Connection["stat"]["direction"];
export type PeerStatus = Connection["stat"]["status"];

export type Libp2p = ILibp2p & {
  connectionManager: ConnectionManager;
  registrar: Registrar;
};
