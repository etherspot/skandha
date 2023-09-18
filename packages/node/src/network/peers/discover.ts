import { PeerId } from "@libp2p/interface-peer-id";
import { Multiaddr } from "@multiformats/multiaddr";
import { PeerInfo } from "@libp2p/interface-peer-info";
import { ENR, IDiscv5DiscoveryInputOptions } from "@chainsafe/discv5";
import Logger from "api/lib/logger";
import { pruneSetToMax, sleep } from "utils/lib";
import { ssz } from "types/lib";
import { Libp2p } from "../interface";
import { ENRKey, SubnetType } from "../metadata";
import {
  getConnectionsMap,
  getDefaultDialer,
  prettyPrintPeerId,
} from "../../utils";
import { Discv5Worker } from "../discv5";
import { IPeerRpcScoreStore, ScoreState } from "./score";
import {
  deserializeEnrSubnets,
  zeroMempoolnets,
} from "./utils/enrSubnetsDeserialize";

/** Max number of cached ENRs after discovering a good peer */
const MAX_CACHED_ENRS = 100;
/** Max age a cached ENR will be considered for dial */
const MAX_CACHED_ENR_AGE_MS = 5 * 60 * 1000;

export type PeerDiscoveryOpts = {
  maxPeers: number;
  discv5FirstQueryDelayMs: number;
  discv5: Omit<
    IDiscv5DiscoveryInputOptions,
    "metrics" | "searchInterval" | "enabled"
  >;
  connectToDiscv5Bootnodes?: boolean;
};

export type PeerDiscoveryModules = {
  libp2p: Libp2p;
  peerRpcScores: IPeerRpcScoreStore;
  logger: typeof Logger;
};

type PeerIdStr = string;

enum QueryStatusCode {
  NotActive,
  Active,
}
type QueryStatus =
  | { code: QueryStatusCode.NotActive }
  | { code: QueryStatusCode.Active; count: number };

enum DiscoveredPeerStatus {
  bad_score = "bad_score",
  already_connected = "already_connected",
  already_dialing = "already_dialing",
  error = "error",
  attempt_dial = "attempt_dial",
  cached = "cached",
  dropped = "dropped",
}

type UnixMs = number;
export type SubnetDiscvQueryMs = {
  subnet: number;
  type: SubnetType;
  toUnixMs: UnixMs;
  maxPeersToDiscover: number;
};

type CachedENR = {
  peerId: PeerId;
  multiaddrTCP: Multiaddr;
  subnets: Record<SubnetType, boolean[]>;
  addedUnixMs: number;
};

/**
 * PeerDiscovery discovers and dials new peers, and executes discv5 queries.
 * Currently relies on discv5 automatic periodic queries.
 */
export class PeerDiscovery {
  readonly discv5: Discv5Worker;
  private libp2p: Libp2p;
  private peerRpcScores: IPeerRpcScoreStore;
  private logger: typeof Logger;
  private cachedENRs = new Map<PeerIdStr, CachedENR>();
  private randomNodeQuery: QueryStatus = { code: QueryStatusCode.NotActive };
  private peersToConnect = 0;
  private subnetRequests: Record<SubnetType, Map<number, UnixMs>> = {
    mempoolnets: new Map(),
  };

  /** The maximum number of peers we allow (exceptions for subnet peers) */
  private maxPeers: number;
  private discv5StartMs: number;
  private discv5FirstQueryDelayMs: number;

  private connectToDiscv5BootnodesOnStart: boolean | undefined = false;

  constructor(modules: PeerDiscoveryModules, opts: PeerDiscoveryOpts) {
    const { libp2p, peerRpcScores, logger } = modules;
    this.libp2p = libp2p;
    this.peerRpcScores = peerRpcScores;
    this.logger = logger;
    this.maxPeers = opts.maxPeers;
    this.discv5StartMs = 0;
    this.discv5FirstQueryDelayMs = opts.discv5FirstQueryDelayMs;
    this.connectToDiscv5BootnodesOnStart = opts.connectToDiscv5Bootnodes;

    this.discv5 = new Discv5Worker({
      discv5: opts.discv5,
      peerId: modules.libp2p.peerId,
      // logger: this.logger,
    });
    const numBootEnrs = opts.discv5.bootEnrs.length;
    if (numBootEnrs === 0) {
      this.logger.error("PeerDiscovery: discv5 has no boot enr");
    } else {
      this.logger.debug(
        { bootEnrs: numBootEnrs },
        "PeerDiscovery: number of bootEnrs"
      );
    }
  }

  async start(): Promise<void> {
    await this.discv5.start();
    this.discv5StartMs = Date.now();

    this.libp2p.addEventListener("peer:discovery", this.onDiscoveredPeer);
    this.discv5.on("discovered", this.onDiscoveredENR);

    if (this.connectToDiscv5BootnodesOnStart) {
      // In devnet scenarios, especially, we want more control over which peers we connect to.
      // Only dial the discv5.bootEnrs if the option
      // network.connectToDiscv5Bootnodes has been set to true.
      await this.discv5.discoverKadValues();
    }
  }

  async stop(): Promise<void> {
    this.libp2p.removeEventListener("peer:discovery", this.onDiscoveredPeer);
    this.discv5.off("discovered", this.onDiscoveredENR);
    await this.discv5.stop();
  }

  /**
   * Request to find peers, both on specific subnets and in general
   */
  discoverPeers(
    peersToConnect: number,
    subnetRequests: SubnetDiscvQueryMs[] = []
  ): void {
    const subnetsToDiscoverPeers: SubnetDiscvQueryMs[] = [];
    const cachedENRsToDial = new Map<PeerIdStr, CachedENR>();
    // Iterate in reverse to consider first the most recent ENRs
    const cachedENRsReverse: CachedENR[] = [];
    for (const [id, cachedENR] of this.cachedENRs.entries()) {
      if (
        // time expired or
        Date.now() - cachedENR.addedUnixMs > MAX_CACHED_ENR_AGE_MS ||
        // already dialing
        getDefaultDialer(this.libp2p).pendingDials.has(id)
      ) {
        this.cachedENRs.delete(id);
      } else {
        cachedENRsReverse.push(cachedENR);
      }
    }
    cachedENRsReverse.reverse();

    this.peersToConnect += peersToConnect;

    subnet: for (const subnetRequest of subnetRequests) {
      // Extend the toUnixMs for this subnet
      const prevUnixMs = this.subnetRequests[subnetRequest.type].get(
        subnetRequest.subnet
      );
      if (prevUnixMs === undefined || prevUnixMs < subnetRequest.toUnixMs) {
        this.subnetRequests[subnetRequest.type].set(
          subnetRequest.subnet,
          subnetRequest.toUnixMs
        );
      }

      // Get cached ENRs from the discovery service that are in the requested `subnetId`, but not connected yet
      let cachedENRsInSubnet = 0;
      for (const cachedENR of cachedENRsReverse) {
        if (cachedENR.subnets[subnetRequest.type][subnetRequest.subnet]) {
          cachedENRsToDial.set(cachedENR.peerId.toString(), cachedENR);

          if (++cachedENRsInSubnet >= subnetRequest.maxPeersToDiscover) {
            continue subnet;
          }
        }
      }

      // Query a discv5 query if more peers are needed
      subnetsToDiscoverPeers.push(subnetRequest);
    }

    // If subnetRequests won't connect enough peers for peersToConnect, add more
    if (cachedENRsToDial.size < peersToConnect) {
      for (const cachedENR of cachedENRsReverse) {
        cachedENRsToDial.set(cachedENR.peerId.toString(), cachedENR);
        if (cachedENRsToDial.size >= peersToConnect) {
          break;
        }
      }
    }

    // Queue an outgoing connection request to the cached peers that are on `s.subnet_id`.
    // If we connect to the cached peers before the discovery query starts, then we potentially
    // save a costly discovery query.
    for (const [id, cachedENRToDial] of cachedENRsToDial) {
      this.cachedENRs.delete(id);
      void this.dialPeer(cachedENRToDial);
    }

    // Run a discv5 subnet query to try to discover new peers
    if (
      subnetsToDiscoverPeers.length > 0 ||
      cachedENRsToDial.size < peersToConnect
    ) {
      void this.runFindRandomNodeQuery();
    }
  }

  /**
   * Request to find peers. First, looked at cached peers in peerStore
   */
  private async runFindRandomNodeQuery(): Promise<void> {
    const msSinceDiscv5Start = Date.now() - this.discv5StartMs;
    if (msSinceDiscv5Start <= this.discv5FirstQueryDelayMs) {
      await sleep(this.discv5FirstQueryDelayMs - msSinceDiscv5Start);
    }

    // Use async version to prevent blocking the event loop
    // Time to completion of this function is not critical, in case this async call add extra lag
    this.randomNodeQuery = { code: QueryStatusCode.Active, count: 0 };

    try {
      await this.discv5.findRandomNode();
    } catch (e) {
      this.logger.error("Error on discv5.findNode()", {}, e as Error);
    } finally {
      this.randomNodeQuery = { code: QueryStatusCode.NotActive };
    }
  }

  /**
   * Progressively called by libp2p peer discovery as a result of any query.
   */
  private onDiscoveredPeer = async (
    evt: CustomEvent<PeerInfo>
  ): Promise<void> => {
    const { id, multiaddrs } = evt.detail;
    const mempoolnets = zeroMempoolnets;
    await this.handleDiscoveredPeer(id, multiaddrs[0], mempoolnets);
  };

  /**
   * Progressively called by discv5 as a result of any query.
   */
  private onDiscoveredENR = async (enr: ENR): Promise<void> => {
    if (this.randomNodeQuery.code === QueryStatusCode.Active) {
      this.randomNodeQuery.count++;
    }
    // async due to some crypto that's no longer necessary
    const peerId = await enr.peerId();
    // tcp multiaddr is known to be be present, checked inside the worker
    const multiaddrTCP = enr.getLocationMultiaddr(ENRKey.tcp);
    if (!multiaddrTCP) {
      this.logger.error("Discv5 worker sent enr without tcp multiaddr", {
        enr: enr.encodeTxt(),
      });
      return;
    }
    // Are this fields mandatory?
    const mempoolnetsBytes = enr.kvs.get(ENRKey.mempoolSubnets); // 64 bits

    // Use faster version than ssz's implementation that leverages pre-cached.
    // Some nodes don't serialize the bitfields properly, encoding the syncnets as attnets,
    // which cause the ssz implementation to throw on validation. deserializeEnrSubnets() will
    // never throw and treat too long or too short bitfields as zero-ed
    const mempoolnets = mempoolnetsBytes
      ? deserializeEnrSubnets(mempoolnetsBytes, ssz.MEMPOOL_ID_SUBNET_COUNT)
      : zeroMempoolnets;

    await this.handleDiscoveredPeer(peerId, multiaddrTCP, mempoolnets);
  };

  /**
   * Progressively called by peer discovery as a result of any query.
   */
  private async handleDiscoveredPeer(
    peerId: PeerId,
    multiaddrTCP: Multiaddr,
    mempoolnets: boolean[]
  ): Promise<DiscoveredPeerStatus> {
    try {
      // Check if peer is not banned or disconnected
      if (this.peerRpcScores.getScoreState(peerId) !== ScoreState.Healthy) {
        return DiscoveredPeerStatus.bad_score;
      }

      // Ignore connected peers. TODO: Is this check necessary?
      if (this.isPeerConnected(peerId.toString())) {
        return DiscoveredPeerStatus.already_connected;
      }

      // Ignore dialing peers
      if (getDefaultDialer(this.libp2p).pendingDials.has(peerId.toString())) {
        return DiscoveredPeerStatus.already_dialing;
      }

      // Should dial peer?
      const cachedPeer: CachedENR = {
        peerId,
        multiaddrTCP,
        subnets: { mempoolnets },
        addedUnixMs: Date.now(),
      };

      // Only dial peer if necessary
      if (this.shouldDialPeer(cachedPeer)) {
        await this.dialPeer(cachedPeer);
        return DiscoveredPeerStatus.attempt_dial;
      } else {
        // Add to pending good peers with a last seen time
        this.cachedENRs.set(peerId.toString(), cachedPeer);
        const dropped = pruneSetToMax(this.cachedENRs, MAX_CACHED_ENRS);
        // If the cache was already full, count the peer as dropped
        return dropped > 0
          ? DiscoveredPeerStatus.dropped
          : DiscoveredPeerStatus.cached;
      }
    } catch (e) {
      this.logger.error("Error onDiscovered", {}, e as Error);
      return DiscoveredPeerStatus.error;
    }
  }

  private shouldDialPeer(peer: CachedENR): boolean {
    if (this.peersToConnect > 0) {
      return true;
    }

    for (const type of [SubnetType.mempoolnets]) {
      for (const [subnet, toUnixMs] of this.subnetRequests[type].entries()) {
        if (toUnixMs < Date.now()) {
          // Prune all requests
          this.subnetRequests[type].delete(subnet);
        } else {
          if (peer.subnets[type][subnet]) {
            return true;
          }
        }
      }
    }

    return false;
  }

  /**
   * Handles DiscoveryEvent::QueryResult
   * Peers that have been returned by discovery requests are dialed here if they are suitable.
   */
  private async dialPeer(cachedPeer: CachedENR): Promise<void> {
    // we dial a peer when:
    // - this.peersToConnect > 0
    // - or the peer subscribes to a subnet that we want
    // If this.peersToConnect is 3 while we need to dial 5 subnet peers, in that case we want this.peersToConnect
    // to be 0 instead of a negative value. The next heartbeat may increase this.peersToConnect again if some dials
    // are not successful.
    this.peersToConnect = Math.max(this.peersToConnect - 1, 0);

    const { peerId, multiaddrTCP } = cachedPeer;

    // Must add the multiaddrs array to the address book before dialing
    // https://github.com/libp2p/js-libp2p/blob/aec8e3d3bb1b245051b60c2a890550d262d5b062/src/index.js#L638
    await this.libp2p.peerStore.addressBook.add(peerId, [multiaddrTCP]);

    // Note: PeerDiscovery adds the multiaddrTCP beforehand
    const peerIdShort = prettyPrintPeerId(peerId);
    this.logger.debug({ peer: peerIdShort }, "Dialing discovered peer");

    // Note: `libp2p.dial()` is what libp2p.connectionManager autoDial calls
    // Note: You must listen to the connected events to listen for a successful conn upgrade
    try {
      await this.libp2p.dial(peerId);
      this.logger.debug({ peer: peerIdShort }, "Dialed discovered peer");
    } catch (e) {
      formatLibp2pDialError(e as Error);
      this.logger.debug(
        { peer: peerIdShort, error: e },
        "Error dialing discovered peer"
      );
    }
  }

  /** Check if there is 1+ open connection with this peer */
  private isPeerConnected(peerIdStr: PeerIdStr): boolean {
    const connections = getConnectionsMap(this.libp2p.connectionManager).get(
      peerIdStr
    );
    return Boolean(
      connections &&
        connections.some((connection) => connection.stat.status === "OPEN")
    );
  }
}

function formatLibp2pDialError(e: Error): void {
  const errorMessage = e.message.trim();
  const newlineIndex = errorMessage.indexOf("\n");
  e.message =
    newlineIndex !== -1 ? errorMessage.slice(0, newlineIndex) : errorMessage;

  if (
    e.message.includes("The operation was aborted") ||
    e.message.includes("stream ended before 1 bytes became available") ||
    e.message.includes("The operation was aborted")
  ) {
    e.stack === undefined;
  }
}
