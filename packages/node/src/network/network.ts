import { Connection } from "@libp2p/interface-connection";
import { Multiaddr } from "@multiformats/multiaddr";
import { PeerId } from "@libp2p/interface-peer-id";
import { INetwork, Libp2p } from "./interface";
import { INetworkEventBus, NetworkEventBus } from "./events";
import { MetadataController } from "./metadata";
import { ILogger } from "utils/lib";

export class Network implements INetwork {
    events: INetworkEventBus;
    metadata: MetadataController;
    gossip: any; //TODO - Define the class for gossipsub
    reqResp: any; //TODO - Define the class for reqResp
    syncService: any; //TODO - The service that handles sync across bundler nodes

    private readonly logger: ILogger;
    private readonly libp2p: Libp2p;
    private readonly signal: AbortSignal;
    //private readonly peerManager: PeerManager;

    constructor(opts: any) {
        this.events = new NetworkEventBus();
        this.metadata = new MetadataController({});
        this.libp2p = opts.libp2p;
        this.signal = opts.signal;
        this.logger = opts.logger;

        // this.gossip = new BundlerGossipHandler();
        // this.reqResp = new BundlerReqRespHandler();
        // this.syncService = new BundlerSyncService();
        // this.peersManager = new PeersManager();
        // subscribe to all events
        // subscribe to abort signal
        this.signal.addEventListener("abort", this.close.bind(this), {once: true});
        this.logger.info("Initialised the bundler node module","node");
    }

    /** Shutdown the bundler node */
    close(): void {
        //switch off all event subscriptions.
    }

    /** Start bundler node */
    start(): Promise<void> {
        //start all services in an order
        // this.libp2p.start();

    }

    /** Stop the bundler service node */
    stop(): Promise<void> {

    }
    getEnr(): Promise<SignableENR | undefined> {
    
    }
    getConnectionsByPeer(): Map<string, Connection[]>  {

    }
    getConnectedPeers(): PeerId[] {

    }
    hasSomeConnectedPeer(): boolean  {
        return false;
    }

    /* List of p2p functions supported by Bundler */
    publishUserOp(userOp: ts.UserOp): Promise<void> {

    }

    //Gossip handler
    subscribeGossipCoreTopics(): void {

    }

    unsubscribeGossipCoreTopics(): void {

    }

    isSubscribedToGossipCoreTopics(): boolean {

    }

    // Debug
    connectToPeer(peer: PeerId, multiaddr: Multiaddr[]): Promise<void> {

    }

    disconnectPeer(peer: PeerId): Promise<void> {

    }

    getAgentVersion(peerIdStr: string): string {

    }
};