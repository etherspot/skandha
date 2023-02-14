import { generateKeypair, KeypairType, SignableENR, } from "@chainsafe/discv5";
export const defaultDiscv5Options = {
    bindAddr: "/ip4/0.0.0.0/udp/4337",
    enr: SignableENR.createV4(generateKeypair(KeypairType.Secp256k1)),
    bootEnrs: [],
    enrUpdate: true,
    enabled: true,
};
export const defaultNetworkOptions = {
    maxPeers: 5,
    targetPeers: 5,
    discv5FirstQueryDelayMs: 1000,
    localMultiaddrs: ["/ip4/0.0.0.0/tcp/4337"],
    bootMultiaddrs: [],
    mdns: false,
    discv5: defaultDiscv5Options,
};
//# sourceMappingURL=network.js.map