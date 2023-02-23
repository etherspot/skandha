import {
  generateKeypair,
  IDiscv5DiscoveryInputOptions,
  KeypairType,
  SignableENR,
} from "@chainsafe/discv5";
import { PeerManagerOpts } from "./peers";

export const defaultDiscv5Options: IDiscv5DiscoveryInputOptions = {
  bindAddr: "/ip4/0.0.0.0/udp/4337",
  enr: SignableENR.createV4(generateKeypair(KeypairType.Secp256k1)),
  bootEnrs: [],
  enrUpdate: true,
  enabled: true,
};

export interface INetworkOptions extends PeerManagerOpts {
  localMultiaddrs: string[];
  bootMultiaddrs?: string[];
  subscribeAllSubnets?: boolean;
  mdns: boolean;
  connectToDiscv5Bootnodes?: boolean;
  version?: string;
}

export const defaultNetworkOptions: INetworkOptions = {
  maxPeers: 5, // Allow some room above targetPeers for new inbound peers
  targetPeers: 5,
  discv5FirstQueryDelayMs: 1000,
  localMultiaddrs: ["/ip4/0.0.0.0/tcp/4337"],
  bootMultiaddrs: [],
  mdns: false,
  discv5: defaultDiscv5Options,
};
