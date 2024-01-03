import { PeerId } from "@libp2p/interface-peer-id";
import { Direction } from "@libp2p/interface-connection";
import { shuffle, MapDef } from "utils/lib";

const LOW_SCORE_TO_PRUNE_IF_TOO_MANY_PEERS = -2;

/**
 * Instead of attempting to connect the exact amount necessary this will overshoot a little since the success
 * rate of outgoing connections is low, <33%. If we try to connect exactly `targetPeers - connectedPeerCount` the
 * peer count will almost always be just below targetPeers triggering constant discoveries that are not necessary
 */
const PEERS_TO_CONNECT_OVERSHOOT_FACTOR = 3;

const OUTBOUND_PEERS_RATIO = 0.1;

type PeerInfo = {
  id: PeerId;
  direction: Direction | null;
  score: number;
};

export interface PrioritizePeersOpts {
  targetPeers: number;
  maxPeers: number;
  outboundPeersRatio?: number;
}

export enum ExcessPeerDisconnectReason {
  LOW_SCORE = "low_score",
  NO_LONG_LIVED = "no_long_lived",
  FIND_BETTER_PEERS = "find_better_peers",
}

/**
 * Prioritize which peers to disconect and which to connect. Conditions:
 * - Reach `targetPeers`
 * - Don't exceed `maxPeers`
 * - Ensure there are enough peers
 * - Prioritize peers with good score
 */
export function prioritizePeers(
  connectedPeersInfo: {
    id: PeerId;
    direction: Direction | null;
    score: number;
  }[],
  opts: PrioritizePeersOpts
): {
  peersToConnect: number;
  peersToDisconnect: Map<ExcessPeerDisconnectReason, PeerId[]>;
} {
  const { targetPeers, maxPeers } = opts;

  let peersToConnect = 0;
  const peersToDisconnect = new MapDef<ExcessPeerDisconnectReason, PeerId[]>(
    () => []
  );

  // Pre-compute trueBitIndexes for re-use below
  const connectedPeers = connectedPeersInfo.map(
    (peer): PeerInfo => ({
      id: peer.id,
      direction: peer.direction,
      score: peer.score,
    })
  );

  const connectedPeerCount = connectedPeers.length;

  if (connectedPeerCount < targetPeers) {
    // Need more peers.
    // Instead of attempting to connect the exact amount necessary this will overshoot a little since the success
    // rate of outgoing connections is low, <33%. If we try to connect exactly `targetPeers - connectedPeerCount` the
    // peer count will almost always be just below targetPeers triggering constant discoveries that are not necessary
    peersToConnect = Math.min(
      PEERS_TO_CONNECT_OVERSHOOT_FACTOR * (targetPeers - connectedPeerCount),
      // Never attempt to connect more peers than maxPeers even considering a low chance of dial success
      maxPeers - connectedPeerCount
    );
  } else if (connectedPeerCount > targetPeers) {
    pruneExcessPeers(connectedPeers, peersToDisconnect, opts);
  }

  return {
    peersToConnect,
    peersToDisconnect,
  };
}

/**
 * Remove excess peers back down to our target values.
 */
function pruneExcessPeers(
  connectedPeers: PeerInfo[],
  peersToDisconnect: MapDef<ExcessPeerDisconnectReason, PeerId[]>,
  opts: PrioritizePeersOpts
): void {
  const { targetPeers, outboundPeersRatio = OUTBOUND_PEERS_RATIO } = opts;
  const connectedPeerCount = connectedPeers.length;
  const outboundPeersTarget = Math.round(
    outboundPeersRatio * connectedPeerCount
  );

  // Count outbound peers
  let outboundPeers = 0;
  for (const peer of connectedPeers) {
    if (peer.direction === "outbound") {
      outboundPeers++;
    }
  }

  let outboundPeersEligibleForPruning = 0;

  const sortedPeers = sortPeersToPrune(connectedPeers);

  const peersEligibleForPruning = sortedPeers
    // Then, iterate from highest score to lowest doing a manual filter for duties and outbound ratio
    .filter((peer) => {
      // outbound peers up to OUTBOUND_PEER_RATIO sorted by highest score and not eligible for pruning
      if (peer.direction === "outbound") {
        if (
          outboundPeers - outboundPeersEligibleForPruning >
          outboundPeersTarget
        ) {
          outboundPeersEligibleForPruning++;
        } else {
          return false;
        }
      }

      return true;
    });

  let peersToDisconnectCount = 0;
  const noLongLivedPeersToDisconnect: PeerId[] = [];

  const peersToDisconnectTarget = connectedPeerCount - targetPeers;

  for (const peer of peersEligibleForPruning) {
    if (peersToDisconnectCount < peersToDisconnectTarget) {
      noLongLivedPeersToDisconnect.push(peer.id);
      peersToDisconnectCount++;
    }
  }
  peersToDisconnect.set(
    ExcessPeerDisconnectReason.NO_LONG_LIVED,
    noLongLivedPeersToDisconnect
  );

  // 2. Disconnect peers that have score < LOW_SCORE_TO_PRUNE_IF_TOO_MANY_PEERS
  const badScorePeersToDisconnect: PeerId[] = [];
  for (const peer of peersEligibleForPruning) {
    if (
      peer.score < LOW_SCORE_TO_PRUNE_IF_TOO_MANY_PEERS &&
      peersToDisconnectCount < peersToDisconnectTarget &&
      !noLongLivedPeersToDisconnect.includes(peer.id)
    ) {
      badScorePeersToDisconnect.push(peer.id);
      peersToDisconnectCount++;
    }
  }
  peersToDisconnect.set(
    ExcessPeerDisconnectReason.LOW_SCORE,
    badScorePeersToDisconnect
  );

  // 3. Disconnect peers
  const tooGroupedPeersToDisconnect: PeerId[] = [];
  if (peersToDisconnectCount < peersToDisconnectTarget) {
    // populate the above variables
    for (const peer of connectedPeers) {
      if (
        noLongLivedPeersToDisconnect.includes(peer.id) ||
        badScorePeersToDisconnect.includes(peer.id)
      ) {
        continue;
      }
    }

    const remainingPeersToDisconnect: PeerId[] = [];
    for (const { id } of sortedPeers) {
      if (peersToDisconnectCount >= peersToDisconnectTarget) {
        break;
      }
      if (
        noLongLivedPeersToDisconnect.includes(id) ||
        badScorePeersToDisconnect.includes(id) ||
        tooGroupedPeersToDisconnect.includes(id)
      ) {
        continue;
      }
      remainingPeersToDisconnect.push(id);
      peersToDisconnectCount++;
    }

    peersToDisconnect.set(
      ExcessPeerDisconnectReason.FIND_BETTER_PEERS,
      remainingPeersToDisconnect
    );
  }
}

/**
 * Sort peers ascending, peer-0 has the most chance to prune, peer-n has the least.
 * Shuffling first to break ties.
 */
export function sortPeersToPrune(connectedPeers: PeerInfo[]): PeerInfo[] {
  return shuffle(connectedPeers);
}
