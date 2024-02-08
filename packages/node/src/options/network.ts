import { homedir } from "node:os";
import {
  IDiscv5DiscoveryInputOptions,
  SignableENR,
  createKeypairFromPeerId,
} from "@chainsafe/discv5";
import { P2POptions, defaultP2POptions } from "types/lib/options";
import { createSecp256k1PeerId } from "@libp2p/peer-id-factory";
import { PeerManagerOpts } from "./peers";

export const defaultP2PHost = "127.0.0.1";
export const defaultP2PPort = 4337;
export interface INetworkOptions extends PeerManagerOpts {
  localMultiaddrs: string[];
  bootMultiaddrs?: string[];
  mdns: boolean;
  connectToDiscv5Bootnodes?: boolean;
  version?: string;
  dataDir: string;
}

export const initNetworkOptions = (
  enr: SignableENR,
  p2pOptions: P2POptions,
  dataDir: string
): INetworkOptions => {
  if (dataDir === "") {
    dataDir = `${homedir()}/.skandha/db/`;
  }

  const discv5Options: IDiscv5DiscoveryInputOptions = {
    bindAddr: `/ip4/${p2pOptions.host}/udp/${p2pOptions.enrPort}`,
    enr: enr,
    bootEnrs: p2pOptions.bootEnrs,
    enrUpdate: true,
    enabled: true,
  };

  const networkOptions = {
    maxPeers: 7, // Allow some room above targetPeers for new inbound peers
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

const randomPeerId = await createSecp256k1PeerId();
export const defaultNetworkOptions = initNetworkOptions(
  SignableENR.createV4(createKeypairFromPeerId(randomPeerId)),
  defaultP2POptions,
  ""
);
