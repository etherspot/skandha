import { PeerId } from "@libp2p/interface-peer-id";
import { ENR, SignableENR } from "@chainsafe/discv5";
import logger from "api/lib/logger";
import { Libp2p } from "../interface";
import { Eth2PeerDataStore } from "../peers/datastore";
import { defaultNetworkOptions, INetworkOptions } from "../../options";
import { createNodejsLibp2p as _createNodejsLibp2p } from "./bundle";

export type NodeJsLibp2pOpts = {
  peerStoreDir?: string;
  disablePeerDiscovery?: boolean;
  metrics?: boolean;
};

/**
 *
 * @param peerIdOrPromise Create an instance of NodejsNode asynchronously
 * @param networkOpts
 * @param peerStoreDir
 */
export async function createNodeJsLibp2p(
  peerIdOrPromise: PeerId | Promise<PeerId>,
  networkOpts: Partial<INetworkOptions> = {},
  nodeJsLibp2pOpts: NodeJsLibp2pOpts = {}
): Promise<Libp2p> {
  const peerId = await Promise.resolve(peerIdOrPromise);
  const localMultiaddrs =
    networkOpts.localMultiaddrs || defaultNetworkOptions.localMultiaddrs;
  const bootMultiaddrs =
    networkOpts.bootMultiaddrs || defaultNetworkOptions.bootMultiaddrs;
  const enr = networkOpts.discv5?.enr;
  const { peerStoreDir, disablePeerDiscovery } = nodeJsLibp2pOpts;

  if (enr !== undefined && typeof enr !== "string") {
    if (enr instanceof SignableENR) {
      // TODO: clear if not args.nat
      // if (
      //   enr.getLocationMultiaddr("udp") &&
      //   !isLocalMultiAddr(enr.getLocationMultiaddr("udp"))
      // ) {
      //   clearMultiaddrUDP(enr);
      // }
    } else {
      throw Error("network.discv5.enr must be an instance of ENR");
    }
  }

  let datastore: undefined | Eth2PeerDataStore = undefined;
  if (peerStoreDir) {
    datastore = new Eth2PeerDataStore(peerStoreDir);
    await datastore.open();
  }

  // Append discv5.bootEnrs to bootMultiaddrs if requested
  logger.debug(`ip: ${(networkOpts.discv5?.enr as SignableENR).ip}`);
  logger.debug(`tcp: ${(networkOpts.discv5?.enr as SignableENR).tcp}`);
  if (networkOpts.connectToDiscv5Bootnodes) {
    if (!networkOpts.bootMultiaddrs) {
      networkOpts.bootMultiaddrs = [];
    }
    if (!networkOpts.discv5) {
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      networkOpts.discv5 = defaultNetworkOptions.discv5!;
    }
    for (const enrOrStr of networkOpts.discv5.bootEnrs) {
      const enr =
        typeof enrOrStr === "string" ? ENR.decodeTxt(enrOrStr) : enrOrStr;
      const fullMultiAddr = await enr.getFullMultiaddr("tcp");
      logger.debug(`${enrOrStr}, ${fullMultiAddr}`);
      const multiaddrWithPeerId = fullMultiAddr?.toString();
      if (multiaddrWithPeerId) {
        networkOpts.bootMultiaddrs.push(multiaddrWithPeerId);
      }
    }
  }

  return _createNodejsLibp2p({
    peerId,
    addresses: { listen: localMultiaddrs },
    datastore,
    bootMultiaddrs: bootMultiaddrs,
    maxConnections: networkOpts.maxPeers,
    minConnections: networkOpts.targetPeers,
    // If peer discovery is enabled let the default in NodejsNode
    peerDiscovery: disablePeerDiscovery ? [] : undefined,
    skandhaVersion: networkOpts.version,
    mdns: networkOpts.mdns,
  });
}
