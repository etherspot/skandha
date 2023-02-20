import { NetworkEventBus } from "./events";
import { MetadataController } from "./metadata";
export class Network {
    events;
    metadata;
    gossip; //TODO - Define the class for gossipsub
    reqResp; //TODO - Define the class for reqResp
    syncService; //TODO - The service that handles sync across bundler nodes
    logger;
    libp2p;
    signal;
    //private readonly peerManager: PeerManager;
    constructor(opts) {
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
        this.signal.addEventListener("abort", this.close.bind(this), { once: true });
        this.logger.info("Initialised the bundler node module", "node");
    }
    /** Shutdown the bundler node */
    close() {
        //switch off all event subscriptions.
    }
    /** Start bundler node */
    start() {
        //start all services in an order
        // this.libp2p.start();
    }
    /** Stop the bundler service node */
    stop() {
    }
    getEnr() {
    }
    getConnectionsByPeer() {
    }
    getConnectedPeers() {
    }
    hasSomeConnectedPeer() {
        return false;
    }
    /* List of p2p functions supported by Bundler */
    publishUserOp(userOp) {
    }
    //Gossip handler
    subscribeGossipCoreTopics() {
    }
    unsubscribeGossipCoreTopics() {
    }
    isSubscribedToGossipCoreTopics() {
    }
    // Debug
    connectToPeer(peer, multiaddr) {
    }
    disconnectPeer(peer) {
    }
    getAgentVersion(peerIdStr) {
    }
}
;
//# sourceMappingURL=network.js.map