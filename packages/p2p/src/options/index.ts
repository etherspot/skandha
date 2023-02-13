import {generateKeypair, IDiscv5DiscoveryInputOptions, KeypairType, SignableENR} from "@chainsafe/discv5";
// import {Eth2GossipsubOpts} from "./gossip";
// import {defaultGossipHandlerOpts, GossipHandlerOpts} from "./gossip/handlers/index.js";
// import {PeerManagerOpts} from "./peers/index.js";
// import {ReqRespBeaconNodeOpts} from "./reqresp/ReqRespBeaconNode.js";

export interface INetworkOptions { // extends PeerManagerOpts, ReqRespBeaconNodeOpts, GossipHandlerOpts, Eth2GossipsubOpts {
  localMultiaddrs: string[];
  bootMultiaddrs?: string[];
  subscribeAllSubnets?: boolean;
  mdns: boolean;
  connectToDiscv5Bootnodes?: boolean;
  version?: string;
}

export const defaultDiscv5Options: IDiscv5DiscoveryInputOptions = {
  bindAddr: "/ip4/0.0.0.0/udp/4337",
  enr: SignableENR.createV4(generateKeypair(KeypairType.Secp256k1)),
  bootEnrs: [],
  enrUpdate: true,
  enabled: true,
};

export const defaultNetworkOptions: INetworkOptions = {
  // maxPeers: 55, // Allow some room above targetPeers for new inbound peers
  // targetPeers: 50,
  // discv5FirstQueryDelayMs: 1000,
  localMultiaddrs: ["/ip4/0.0.0.0/tcp/4337"],
  bootMultiaddrs: [],
  mdns: false,
  // discv5: defaultDiscv5Options,
  // rateLimitMultiplier: 1,
  // ...defaultGossipHandlerOpts,
};

export interface IBundlerNodeOptions {
    // api: IApiOptions;
    // db: IDbOptions;
    p2p: INetworkOptions;
};
  
export const defaultOptions: IBundlerNodeOptions = {
    // api: defaultApiOptions,
    // db: defaultDbOptions,
    p2p: defaultNetworkOptions,
};