import {
  generateKeypair,
  IDiscv5DiscoveryInputOptions,
  KeypairType,
  SignableENR,
} from "@chainsafe/discv5";
import { PeerManagerOpts } from "./peers";

export const defaultP2PHost = "127.0.0.1";
export const defaultP2PPort = 4337;
export interface INetworkOptions extends PeerManagerOpts {
  localMultiaddrs: string[];
  bootMultiaddrs?: string[];
  subscribeAllSubnets?: boolean;
  mdns: boolean;
  connectToDiscv5Bootnodes?: boolean;
  version?: string;
  dataDir: string;
}

export const buildDefaultNetworkOptions = (
  p2pHost: string,
  p2pPort: number,
  bootEnrs: string[],
  dataDir: string
): INetworkOptions => {
  const defaultEnr = SignableENR.createV4(
    generateKeypair(KeypairType.Secp256k1)
  );
  defaultEnr.ip = p2pHost;
  defaultEnr.udp = p2pPort;
  defaultEnr.tcp = p2pPort;

  const discv5Options: IDiscv5DiscoveryInputOptions = {
    bindAddr: `/ip4/0.0.0.0/udp/${p2pPort}`,
    enr: defaultEnr,
    bootEnrs: bootEnrs,
    enrUpdate: true,
    enabled: true,
  };

  const networkOptions = {
    maxPeers: 5, // Allow some room above targetPeers for new inbound peers
    targetPeers: 5,
    discv5FirstQueryDelayMs: 1000,
    localMultiaddrs: [`/ip4/0.0.0.0/tcp/${p2pPort}`],
    bootMultiaddrs: [],
    mdns: false,
    discv5: discv5Options,
    connectToDiscv5Bootnodes: true,
    dataDir,
  };

  return networkOptions;
};

export const defaultNetworkOptions = buildDefaultNetworkOptions(
  defaultP2PHost,
  defaultP2PPort,
  [],
  ""
);
