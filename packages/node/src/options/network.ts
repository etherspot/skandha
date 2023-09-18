import { homedir } from "node:os";
import {
  generateKeypair,
  IDiscv5DiscoveryInputOptions,
  KeypairType,
  SignableENR,
} from "@chainsafe/discv5";
import { defaultP2POptions, P2POptions } from "types/lib/options";
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
  p2pOptions: P2POptions,
  dataDir: string
): INetworkOptions => {
  const defaultEnr = SignableENR.createV4(
    generateKeypair(KeypairType.Secp256k1)
  );
  defaultEnr.ip = p2pOptions.enrHost;
  defaultEnr.udp = p2pOptions.enrPort;
  defaultEnr.tcp = p2pOptions.enrPort;

  if (dataDir === "") {
    dataDir = `${homedir()}/.skandha/db/`;
  }

  const discv5Options: IDiscv5DiscoveryInputOptions = {
    bindAddr: `/ip4/${p2pOptions.host}/udp/${p2pOptions.enrPort}`,
    enr: defaultEnr,
    bootEnrs: p2pOptions.bootEnrs,
    enrUpdate: true,
    enabled: true,
  };

  const networkOptions = {
    maxPeers: 5, // Allow some room above targetPeers for new inbound peers
    targetPeers: 5,
    discv5FirstQueryDelayMs: 1000,
    localMultiaddrs: [`/ip4/${p2pOptions.host}/tcp/${p2pOptions.port}`],
    bootMultiaddrs: [],
    mdns: false,
    discv5: discv5Options,
    connectToDiscv5Bootnodes: true,
    dataDir,
  };

  return networkOptions;
};

export const defaultNetworkOptions = buildDefaultNetworkOptions(
  defaultP2POptions,
  ""
);
