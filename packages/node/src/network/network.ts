import { Connection } from "@libp2p/interface-connection";
import { Multiaddr } from "@multiformats/multiaddr";
import { PeerId } from "@libp2p/interface-peer-id";
import { ts } from "types/lib";
import { SignableENR } from "@chainsafe/discv5";
import logger, { Logger } from "api/lib/logger";
import { INetworkOptions } from "../options";
import { getConnectionsMap } from "../utils";
import { INetwork, Libp2p } from "./interface";
import { INetworkEventBus, NetworkEventBus } from "./events";
import { MetadataController } from "./metadata";
import { createNodeJsLibp2p } from "./nodejs";
import { BundlerGossipsub } from "./gossip";
import { ReqRespBeaconNode } from "./reqresp/ReqRespNode";
import { PeerRpcScoreStore } from "./peers/score";
import { PeersData } from "./peers/peersData";
import { getReqRespHandlers } from "./reqresp/handlers";
import { PeerManager } from "./peers/peerManager";

type NetworkModules = {
  libp2p: Libp2p;
  gossip: BundlerGossipsub;
  reqResp: ReqRespBeaconNode;
  peerManager: PeerManager;
  metadata: MetadataController;
  events: INetworkEventBus;
  peerId: PeerId;
  // discovery: PeerDiscovery;
  // discv5: IDiscv5DiscoveryInputOptions | null;
  // signal: AbortSignal;
};

export type NetworkInitOptions = {
  opts: INetworkOptions;
  peerId: PeerId;
  peerStoreDir?: string;
  // signal: AbortSignal;
};

export class Network implements INetwork {
  closed = false;
  syncService: any;
  peerId!: PeerId;
  localMultiaddrs: Multiaddr[] = [];
  logger: Logger;

  events: INetworkEventBus;
  metadata: MetadataController;
  gossip: BundlerGossipsub;
  reqResp: ReqRespBeaconNode;
  peerManager: PeerManager;
  libp2p: Libp2p;
  // discovery: PeerDiscovery;
  // discv5: IDiscv5DiscoveryInputOptions | null;
  // private readonly signal: AbortSignal;

  constructor(opts: NetworkModules) {
    const {
      libp2p,
      reqResp,
      gossip,
      peerManager,
      metadata,
      events,
      peerId,
      // discovery,
      // discv5,
    } = opts;
    this.libp2p = libp2p;
    this.reqResp = reqResp;
    this.gossip = gossip;
    this.peerManager = peerManager;
    this.logger = logger;
    this.metadata = metadata;
    this.events = events;
    this.peerId = peerId;
    // this.discovery = discovery;
    // this.discv5 = discv5;
    this.logger.info("Initialised the bundler node module", "node");
  }

  static async init(options: NetworkInitOptions): Promise<Network> {
    const libp2p = await createNodeJsLibp2p(options.peerId, options.opts, {
      peerStoreDir: options.peerStoreDir,
    });

    const gossip = new BundlerGossipsub({ libp2p });
    const peersData = new PeersData();
    const peerRpcScores = new PeerRpcScoreStore();
    const networkEventBus = new NetworkEventBus();
    const events = new NetworkEventBus();
    const metadata = new MetadataController({});
    const reqResp = new ReqRespBeaconNode({
      libp2p,
      peersData,
      logger,
      reqRespHandlers: getReqRespHandlers(),
      metadata,
      peerRpcScores,
      networkEventBus,
    });

    const peerManagerModules = {
      libp2p,
      reqResp,
      gossip,
      // attnetsService,
      // syncnetsService,
      logger,
      peerRpcScores,
      networkEventBus,
      peersData,
    };
    // const discv5 = options.opts.discv5;
    // const discovery = new PeerDiscovery(peerManagerModules, {
    //   maxPeers: options.opts.maxPeers,
    //   discv5FirstQueryDelayMs: options.opts.discv5FirstQueryDelayMs,
    //   // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    //   discv5: {
    //     ...discv5!,
    //     enrUpdate: true,
    //   },
    //   connectToDiscv5Bootnodes: options.opts.connectToDiscv5Bootnodes,
    // });
    const peerManager = new PeerManager(peerManagerModules, options.opts);

    return new Network({
      libp2p,
      gossip,
      reqResp,
      peerManager,
      metadata,
      events,
      peerId: options.peerId,
      // discovery,
      // discv5: discv5,
    });
  }

  /** Shutdown the bundler node */
  close(): void {
    //switch off all event subscriptions.
  }

  /** Start bundler node */
  async start(): Promise<void> {
    //start all services in an order
    await this.libp2p.start();
    await this.reqResp.start();
    this.reqResp.registerProtocols();

    await this.peerManager.start();
    const discv5 = this.peerManager["discovery"]?.discv5;
    if (!discv5) {
      throw new Error("Discv5 not initialized");
    }
    const setEnrValue = discv5?.setEnrValue.bind(discv5);
    this.metadata.start(setEnrValue);

    await this.gossip.start();

    const multiaddresses = this.libp2p
      .getMultiaddrs()
      .map((m) => m.toString())
      .join(",");

    this.logger.info(
      `PeerId ${this.libp2p.peerId.toString()}, Multiaddrs ${multiaddresses}`
    );

    const enr = await this.getEnr();
    if (enr) {
      this.logger.info(`ENR: ${enr.encodeTxt()}`);
    } else {
      this.logger.error("Enr not accessible");
    }
  }

  /** Stop the bundler service node */
  async stop(): Promise<void> {
    if (this.closed) return;

    // Must goodbye and disconnect before stopping libp2p
    // await this.peerManager.goodbyeAndDisconnectAllPeers();
    // await this.peerManager.stop();
    await this.gossip.stop();

    await this.reqResp.stop();
    await this.reqResp.unregisterAllProtocols();

    await this.libp2p.stop();

    this.closed = true;
  }
  async getEnr(): Promise<SignableENR | undefined> {
    return this.peerManager["discovery"]?.discv5.enr();
  }
  getConnectionsByPeer(): Map<string, Connection[]> {
    return getConnectionsMap(this.libp2p.connectionManager);
  }
  getConnectedPeers(): PeerId[] {
    return this.peerManager.getConnectedPeerIds();
  }
  hasSomeConnectedPeer(): boolean {
    return false;
  }

  /* List of p2p functions supported by Bundler */
  async publishUserOp(_userOp: ts.UserOp): Promise<void> {}

  //Gossip handler
  subscribeGossipCoreTopics(): void {}

  unsubscribeGossipCoreTopics(): void {}

  isSubscribedToGossipCoreTopics(): boolean {
    return true;
  }

  // Debug
  async connectToPeer(peer: PeerId, multiaddr: Multiaddr[]): Promise<void> {
    await this.libp2p.peerStore.addressBook.add(peer, multiaddr);
    await this.libp2p.dial(peer);
  }

  async disconnectPeer(peer: PeerId): Promise<void> {
    await this.libp2p.hangUp(peer);
  }

  getAgentVersion(_peerIdStr: string): string {
    return "";
  }
}
