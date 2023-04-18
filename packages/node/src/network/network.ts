import { Connection } from "@libp2p/interface-connection";
import { Multiaddr } from "@multiformats/multiaddr";
import { PeerId } from "@libp2p/interface-peer-id";
import { createRSAPeerId } from "@libp2p/peer-id-factory";
import { ts } from "types/lib";
import { SignableENR } from "@chainsafe/discv5";
import { INetworkOptions } from "../options";
import { INetwork, Libp2p } from "./interface";
import { INetworkEventBus, NetworkEventBus } from "./events";
import { MetadataController } from "./metadata";
import { createNodeJsLibp2p } from "./nodejs";

type NetworkModules = {
  libp2p: Libp2p;
  // signal: AbortSignal;
};

export type NetworkInitOptions = {
  opts: INetworkOptions;
  peerId: PeerId;
  peerStoreDir?: string;
  // signal: AbortSignal;
};

export class Network implements INetwork {
  events: INetworkEventBus;
  metadata: MetadataController;
  gossip: any; //TODO - Define the class for gossipsub
  reqResp: any; //TODO - Define the class for reqResp
  syncService: any; //TODO - The service that handles sync across bundler nodes
  peerId!: PeerId;
  localMultiaddrs: Multiaddr[] = [];

  private readonly libp2p: Libp2p;
  // private readonly signal: AbortSignal;

  constructor(opts: NetworkModules) {
    const { libp2p } = opts;
    this.events = new NetworkEventBus();
    this.metadata = new MetadataController({});
    this.libp2p = libp2p;
    // this.signal = signal;
    // this.logger = opts.logger;

    // this.gossip = new BundlerGossipHandler();
    // this.reqResp = new BundlerReqRespHandler();
    // this.syncService = new BundlerSyncService();
    // this.peersManager = new PeersManager();
    // subscribe to all events
    // subscribe to abort signal
    // this.signal.addEventListener("abort", this.close.bind(this), {
    //   once: true,
    // });
    void createRSAPeerId().then((peerId) => {
      this.peerId = peerId;
    });
    // this.logger.info("Initialised the bundler node module", "node");
  }

  static async init(options: NetworkInitOptions): Promise<Network> {
    const libp2p = await createNodeJsLibp2p(options.peerId, options.opts, {
      peerStoreDir: options.peerStoreDir,
    });

    return new Network({
      libp2p: libp2p,
      // signal: options.signal,
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
    console.log("libp2p started");
  }

  /** Stop the bundler service node */
  async stop(): Promise<void> {}
  async getEnr(): Promise<SignableENR | undefined> {
    return undefined;
  }
  getConnectionsByPeer(): Map<string, Connection[]> {
    return new Map<string, Connection[]>();
  }
  getConnectedPeers(): PeerId[] {
    return [];
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
  async connectToPeer(_peer: PeerId, _multiaddr: Multiaddr[]): Promise<void> {}

  async disconnectPeer(_peer: PeerId): Promise<void> {}

  getAgentVersion(_peerIdStr: string): string {
    return "";
  }
}
