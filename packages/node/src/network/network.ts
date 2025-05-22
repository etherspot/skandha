/* eslint-disable @typescript-eslint/no-empty-function */
import { Connection } from "@libp2p/interface-connection";
import { Multiaddr } from "@multiformats/multiaddr";
import { PeerId } from "@libp2p/interface-peer-id";
import { ssz, ts } from "@skandha/types/lib";
import { SignableENR } from "@chainsafe/discv5";
import logger, { Logger } from "@skandha/api/lib/logger";
import { serializeMempoolId } from "@skandha/params/lib";
import { Config } from "@skandha/executor/lib/config";
import { AllChainsMetrics } from "@skandha/monitoring/lib";
import { Executor } from "@skandha/executor/lib/executor";
import { INetworkOptions } from "../options";
import { getConnectionsMap } from "../utils";
import { INetwork, Libp2p } from "./interface";
import { INetworkEventBus, NetworkEventBus } from "./events";
import { MetadataController } from "./metadata";
import { createNodeJsLibp2p } from "./nodejs";
import { BundlerGossipsub } from "./gossip";
import { ReqRespNode } from "./reqresp/ReqRespNode";
import { PeerRpcScoreStore } from "./peers/score";
import { PeersData } from "./peers/peersData";
import { getReqRespHandlers } from "./reqresp/handlers";
import { PeerManager } from "./peers/peerManager";
import { getCoreTopics } from "./gossip/topic";
import { Discv5Worker } from "./discv5";
import { NetworkProcessor } from "./processor";
import { pooledUserOpHashes, pooledUserOpsByHash } from "./reqresp";

type NetworkModules = {
  libp2p: Libp2p;
  gossip: BundlerGossipsub;
  reqResp: ReqRespNode;
  peerManager: PeerManager;
  metadata: MetadataController;
  events: INetworkEventBus;
  peerId: PeerId;
  networkProcessor: NetworkProcessor;
  relayersConfig: Config;
  executor: Executor;
  metrics: AllChainsMetrics | null;
};

export type NetworkInitOptions = {
  opts: INetworkOptions;
  relayersConfig: Config;
  peerId: PeerId;
  executor: Executor;
  peerStoreDir?: string;
  metrics: AllChainsMetrics | null;
};

export class Network implements INetwork {
  closed = false;
  peerId: PeerId;
  logger: Logger;

  events: INetworkEventBus;
  metadata: MetadataController;
  gossip: BundlerGossipsub;
  reqResp: ReqRespNode;
  peerManager: PeerManager;
  libp2p: Libp2p;
  networkProcessor: NetworkProcessor;
  executor: Executor;
  metrics: AllChainsMetrics | null;

  relayersConfig: Config;
  subscribedMempools = new Set<string>();

  constructor(opts: NetworkModules) {
    const {
      libp2p,
      reqResp,
      gossip,
      peerManager,
      metadata,
      events,
      peerId,
      networkProcessor,
      relayersConfig,
      executor,
      metrics,
    } = opts;
    this.libp2p = libp2p;
    this.reqResp = reqResp;
    this.gossip = gossip;
    this.peerManager = peerManager;
    this.logger = logger;
    this.metadata = metadata;
    this.events = events;
    this.peerId = peerId;
    this.networkProcessor = networkProcessor;
    this.relayersConfig = relayersConfig;
    this.executor = executor;
    this.metrics = metrics;
    this.logger.info("Initialised the bundler node module", "node");
  }

  static async init(options: NetworkInitOptions): Promise<Network> {
    const { peerId, relayersConfig, executor, metrics } = options;
    const libp2p = await createNodeJsLibp2p(peerId, options.opts, {
      peerStoreDir: options.peerStoreDir,
    });

    const peersData = new PeersData();
    const peerRpcScores = new PeerRpcScoreStore();
    const networkEventBus = new NetworkEventBus();
    const gossip = new BundlerGossipsub({
      libp2p,
      events: networkEventBus,
      metrics,
    });

    const chainId = relayersConfig.chainId;
    const defaultMetadata = ssz.Metadata.defaultValue();
    const canonicalMempool = relayersConfig.getCanonicalMempool()
    if (canonicalMempool.mempoolId) {
      defaultMetadata.supported_mempools.push(serializeMempoolId(canonicalMempool.mempoolId));
    }
    const metadata = new MetadataController({
      chainId,
      metadata: defaultMetadata,
    });
    const reqResp = new ReqRespNode({
      libp2p,
      peersData,
      logger,
      reqRespHandlers: getReqRespHandlers(executor, relayersConfig, metrics),
      metadata,
      peerRpcScores,
      networkEventBus,
      metrics,
    });

    const networkProcessor = new NetworkProcessor(
      { events: networkEventBus, relayersConfig, executor, metrics },
      {}
    );

    const peerManagerModules = {
      libp2p,
      reqResp,
      gossip,
      logger,
      peerRpcScores,
      networkEventBus,
      peersData,
    };
    const peerManager = new PeerManager(peerManagerModules, options.opts);

    return new Network({
      libp2p,
      gossip,
      reqResp,
      peerManager,
      metadata,
      events: networkEventBus,
      peerId,
      networkProcessor,
      relayersConfig,
      executor,
      metrics,
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

    const canonicalMempool = this.relayersConfig.getCanonicalMempool();
    if (canonicalMempool.mempoolId) {
      this.subscribeGossipCoreTopics(canonicalMempool.mempoolId);
    }

    if (enr) {
      this.logger.info(`ENR: ${enr.encodeTxt()}`);
    } else {
      this.logger.error("Enr not accessible");
    }
  }

  /** Stop the bundler service node */
  async stop(): Promise<void> {
    if (this.closed) return;

    await this.peerManager.goodbyeAndDisconnectAllPeers();
    await this.peerManager.stop();
    await this.gossip.stop();

    await this.reqResp.stop();
    await this.reqResp.unregisterAllProtocols();

    await this.libp2p.stop();

    this.closed = true;
  }

  async getEnr(): Promise<SignableENR | undefined> {
    return this.peerManager["discovery"]?.discv5.enr();
  }

  async getMetadata(): Promise<ts.Metadata> {
    return {
      seq_number: this.metadata.seq_number,
      supported_mempools: this.metadata.supported_mempools,
    };
  }

  get discv5(): Discv5Worker | undefined {
    return this.peerManager["discovery"]?.discv5;
  }

  get localMultiaddrs(): Multiaddr[] {
    return this.libp2p.getMultiaddrs();
  }

  getConnectionsByPeer(): Map<string, Connection[]> {
    return getConnectionsMap(this.libp2p.connectionManager);
  }

  getConnectedPeers(): PeerId[] {
    return this.peerManager.getConnectedPeerIds();
  }

  getConnectedPeerCount(): number {
    return this.peerManager.getConnectedPeerIds().length;
  }

  /* List of p2p functions supported by Bundler */
  async publishVerifiedUserOperation(
    userOp: ts.VerifiedUserOperation,
    mempool: string
  ): Promise<void> {
    await this.gossip.publishVerifiedUserOperation(userOp, mempool);
  }

  async pooledUserOpHashes(
    peerId: PeerId,
    req: ts.PooledUserOpHashesRequest
  ): Promise<ts.PooledUserOpHashes> {
    return await pooledUserOpHashes(
      this.reqResp,
      peerId,
      this.executor,
      this.relayersConfig,
      req
    );
  }

  async pooledUserOpsByHash(
    peerId: PeerId,
    req: ts.PooledUserOpsByHashRequest
  ): Promise<ts.PooledUserOpsByHash> {
    return await pooledUserOpsByHash(
      this.reqResp,
      peerId,
      this.executor,
      this.relayersConfig,
      req
    );
  }

  //Gossip handler
  subscribeGossipCoreTopics(mempool: string): void {
    if (this.subscribedMempools.has(mempool)) return;
    this.subscribedMempools.add(mempool);

    for (const topic of getCoreTopics()) {
      this.gossip.subscribeTopic({ ...topic, mempool });
    }
  }

  unsubscribeGossipCoreTopics(mempool: string): void {
    if (this.subscribedMempools.has(mempool)) return;
    this.subscribedMempools.delete(mempool);

    for (const topic of getCoreTopics()) {
      this.gossip.unsubscribeTopic({ ...topic, mempool });
    }
  }

  isSubscribedToGossipCoreTopics(mempool: string): boolean {
    return this.subscribedMempools.has(mempool);
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
