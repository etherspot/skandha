import {
  generateKeypair,
  IDiscv5DiscoveryInputOptions,
  KeypairType,
  SignableENR,
} from "@chainsafe/discv5";
import { PeerManagerOpts } from "./peers";

const defaultP2pPort = 4337;
const defaultEnr = SignableENR.createV4(generateKeypair(KeypairType.Secp256k1));
defaultEnr.ip = "127.0.0.1";
defaultEnr.udp = defaultP2pPort;
defaultEnr.tcp = defaultP2pPort;
defaultEnr.udp6 = defaultP2pPort;
defaultEnr.tcp6 = defaultP2pPort;

export const defaultDiscv5Options: IDiscv5DiscoveryInputOptions = {
  bindAddr: `/ip4/0.0.0.0/udp/${defaultP2pPort}`,
  enr: defaultEnr,
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
  localMultiaddrs: [`/ip4/0.0.0.0/tcp/${defaultP2pPort}`],
  bootMultiaddrs: [],
  mdns: false,
  discv5: defaultDiscv5Options,
  connectToDiscv5Bootnodes: true,
};
