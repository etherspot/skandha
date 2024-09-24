import { createLibp2p } from "libp2p";
import { tcp } from "@libp2p/tcp";
import { mplex } from "@libp2p/mplex";
import { bootstrap } from "@libp2p/bootstrap";
import { mdns } from "@libp2p/mdns";
import { PeerId } from "@libp2p/interface-peer-id";
import { Datastore } from "interface-datastore";
import type { PeerDiscovery } from "@libp2p/interface-peer-discovery";
import type { Components } from "libp2p/components";
import { Libp2p } from "../interface";
import { createNoise } from "./noise";

export type Libp2pOptions = {
  peerId: PeerId;
  addresses: {
    listen: string[];
    announce?: string[];
  };
  datastore?: Datastore;
  peerDiscovery?: ((components: Components) => PeerDiscovery)[];
  bootMultiaddrs?: string[];
  maxConnections?: number;
  minConnections?: number;
  byzanlinkbundlerVersion?: string;
  mdns?: boolean;
};

export async function createNodejsLibp2p(
  options: Libp2pOptions
): Promise<Libp2p> {
  const peerDiscovery = [];
  if (options.peerDiscovery) {
    peerDiscovery.push(...options.peerDiscovery);
  } else {
    if ((options.bootMultiaddrs?.length ?? 0) > 0) {
      peerDiscovery.push(bootstrap({ list: options.bootMultiaddrs ?? [] }));
    }
    if (options.mdns) {
      peerDiscovery.push(mdns());
    }
  }
  return (await createLibp2p({
    peerId: options.peerId,
    addresses: {
      listen: options.addresses.listen,
      announce: options.addresses.announce || [],
    },
    connectionEncryption: [createNoise()],
    // Reject connections when the server's connection count gets high
    transports: [
      tcp({
        maxConnections: options.maxConnections,
        closeServerOnMaxConnections: {
          closeAbove: options.maxConnections ?? Infinity,
          listenBelow: options.maxConnections ?? Infinity,
        },
      }),
    ],
    streamMuxers: [mplex({ maxInboundStreams: 256 })],
    peerDiscovery,
    connectionManager: {
      // dialer config
      maxParallelDials: 100,
      maxAddrsToDial: 25,
      maxDialsPerPeer: 4,
      dialTimeout: 30_000,

      autoDial: false,
      maxConnections: options.maxConnections,
      minConnections: options.minConnections,
    },
    datastore: options.datastore,
    identify: {
      host: {
        agentVersion: options.byzanlinkbundlerVersion
          ? `byzanlink-bundler/${options.byzanlinkbundlerVersion}`
          : "byzanlink-bundler",
      },
    },
  })) as Libp2p;
}
