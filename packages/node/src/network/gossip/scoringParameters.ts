import {
  defaultTopicScoreParams,
  PeerScoreParams,
  TopicScoreParams,
  PeerScoreThresholds,
} from "@chainsafe/libp2p-gossipsub/score";
import { GossipType } from "./interface";
import { stringifyGossipTopic } from "./topic";

/* eslint-disable @typescript-eslint/naming-convention */

export const ATTESTATION_SUBNET_COUNT = 64;
export const SLOTS_PER_EPOCH = 8;
export const TARGET_AGGREGATORS_PER_COMMITTEE = 16;

export const GOSSIP_D = 8;
export const GOSSIP_D_LOW = 6;
export const GOSSIP_D_HIGH = 12;

const MAX_IN_MESH_SCORE = 10.0;
const MAX_FIRST_MESSAGE_DELIVERIES_SCORE = 40.0;
const BEACON_BLOCK_WEIGHT = 0.5;
const BEACON_AGGREGATE_PROOF_WEIGHT = 0.5;
const VOLUNTARY_EXIT_WEIGHT = 0.05;
const PROPOSER_SLASHING_WEIGHT = 0.05;

const beaconAttestationSubnetWeight = 1 / ATTESTATION_SUBNET_COUNT;
const maxPositiveScore =
  (MAX_IN_MESH_SCORE + MAX_FIRST_MESSAGE_DELIVERIES_SCORE) *
  (BEACON_BLOCK_WEIGHT +
    +BEACON_AGGREGATE_PROOF_WEIGHT +
    beaconAttestationSubnetWeight * ATTESTATION_SUBNET_COUNT +
    VOLUNTARY_EXIT_WEIGHT +
    PROPOSER_SLASHING_WEIGHT);

/**
 * The following params is implemented by Lighthouse at
 * https://github.com/sigp/lighthouse/blob/b0ac3464ca5fb1e9d75060b56c83bfaf990a3d25/beacon_node/eth2_libp2p/src/behaviour/gossipsub_scoring_parameters.rs#L83
 */
export const gossipScoreThresholds: PeerScoreThresholds = {
  gossipThreshold: -4000,
  publishThreshold: -8000,
  graylistThreshold: -16000,
  acceptPXThreshold: 100,
  opportunisticGraftThreshold: 5,
};

/**
 * Peer may sometimes has negative gossipsub score and we give it time to recover, however gossipsub score comes below this we need to take into account.
 * Given gossipsubThresold = -4000, it's comfortable to only ignore negative score gossip peer score > -1000
 */
export const negativeGossipScoreIgnoreThreshold = -1000;

type MeshMessageInfo = {
  decaySlots: number;
  capFactor: number;
  activationWindow: number;
  currentSlot: number;
};

type PreComputedParams = {
  scoreParameterDecayFn: (decayTimeMs: number) => number;
  epochDurationMs: number;
  slotDurationMs: number;
};

type TopicScoreInput = {
  topicWeight: number;
  expectedMessageRate: number;
  firstMessageDecayTime: number;
  meshMessageInfo?: MeshMessageInfo;
};

/**
 * Explanation of each param https://github.com/libp2p/specs/blob/master/pubsub/gossipsub/gossipsub-v1.1.md#peer-scoring
 */
export function computeGossipPeerScoreParams({
  config,
}: any): Partial<PeerScoreParams> {
  const decayIntervalMs = config.SECONDS_PER_SLOT * 1000;
  const decayToZero = 0.01;
  const epochDurationMs = config.SECONDS_PER_SLOT * SLOTS_PER_EPOCH * 1000;
  const slotDurationMs = config.SECONDS_PER_SLOT * 1000;
  const scoreParameterDecayFn = (decayTimeMs: number): number => {
    return scoreParameterDecayWithBase(
      decayTimeMs,
      decayIntervalMs,
      decayToZero
    );
  };
  const behaviourPenaltyDecay = scoreParameterDecayFn(epochDurationMs * 10);
  const behaviourPenaltyThreshold = 6;
  const targetValue =
    decayConvergence(behaviourPenaltyDecay, 10 / SLOTS_PER_EPOCH) -
    behaviourPenaltyThreshold;
  const topicScoreCap = maxPositiveScore * 0.5;

  const params = {
    topics: getAllTopicsScoreParams({
      epochDurationMs,
      slotDurationMs,
      scoreParameterDecayFn,
    }),
    decayInterval: decayIntervalMs,
    decayToZero,
    // time to remember counters for a disconnected peer, should be in ms
    retainScore: epochDurationMs * 100,
    appSpecificWeight: 1,
    IPColocationFactorThreshold: 3,
    // js-gossipsub doesn't have behaviourPenaltiesThreshold
    behaviourPenaltyDecay,
    behaviourPenaltyWeight:
      gossipScoreThresholds.gossipThreshold / (targetValue * targetValue),
    behaviourPenaltyThreshold,
    topicScoreCap,
    IPColocationFactorWeight: -1 * topicScoreCap,
  };
  return params;
}

function getAllTopicsScoreParams(
  precomputedParams: PreComputedParams
): Record<string, TopicScoreParams> {
  const { epochDurationMs } = precomputedParams;
  const topicsParams: Record<string, TopicScoreParams> = {};
  // other topics
  topicsParams[
    stringifyGossipTopic({
      type: GossipType.user_operations,
      mempool: "",
    })
  ] = getTopicScoreParams(precomputedParams, {
    topicWeight: BEACON_BLOCK_WEIGHT,
    expectedMessageRate: 1,
    firstMessageDecayTime: epochDurationMs * 20,
    meshMessageInfo: {
      decaySlots: SLOTS_PER_EPOCH * 5,
      capFactor: 3,
      activationWindow: epochDurationMs,
      currentSlot: 0,
    },
  });
  return topicsParams;
}

function getTopicScoreParams(
  { epochDurationMs, slotDurationMs, scoreParameterDecayFn }: PreComputedParams,
  {
    topicWeight,
    expectedMessageRate,
    firstMessageDecayTime,
    meshMessageInfo,
  }: TopicScoreInput
): TopicScoreParams {
  const params = { ...defaultTopicScoreParams };

  params.topicWeight = topicWeight;

  params.timeInMeshQuantum = slotDurationMs;
  params.timeInMeshCap = 3600 / (params.timeInMeshQuantum / 1000);
  params.timeInMeshWeight = 10 / params.timeInMeshCap;

  params.firstMessageDeliveriesDecay = scoreParameterDecayFn(
    firstMessageDecayTime
  );
  params.firstMessageDeliveriesCap = decayConvergence(
    params.firstMessageDeliveriesDecay,
    (2 * expectedMessageRate) / GOSSIP_D
  );
  params.firstMessageDeliveriesWeight = 40 / params.firstMessageDeliveriesCap;

  if (meshMessageInfo) {
    const { decaySlots, capFactor, activationWindow, currentSlot } =
      meshMessageInfo;
    const decayTimeMs = decaySlots * 1000;
    params.meshMessageDeliveriesDecay = scoreParameterDecayFn(decayTimeMs);
    params.meshMessageDeliveriesThreshold = threshold(
      params.meshMessageDeliveriesDecay,
      expectedMessageRate / 50
    );
    params.meshMessageDeliveriesCap = Math.max(
      capFactor * params.meshMessageDeliveriesThreshold,
      2
    );
    params.meshMessageDeliveriesActivation = activationWindow;
    params.meshMessageDeliveriesWindow = 12 * 1000; // 12s
    params.meshFailurePenaltyDecay = params.meshMessageDeliveriesDecay;
    params.meshMessageDeliveriesWeight =
      (-1 * maxPositiveScore) /
      (params.topicWeight * Math.pow(params.meshMessageDeliveriesThreshold, 2));
    params.meshFailurePenaltyWeight = params.meshMessageDeliveriesWeight;
    if (decaySlots >= currentSlot) {
      params.meshMessageDeliveriesThreshold = 0;
      params.meshMessageDeliveriesWeight = 0;
    }
  } else {
    params.meshMessageDeliveriesWeight = 0;
    params.meshMessageDeliveriesThreshold = 0;
    params.meshMessageDeliveriesDecay = 0;
    params.meshMessageDeliveriesCap = 0;
    params.meshMessageDeliveriesWindow = 0;
    params.meshMessageDeliveriesActivation = 0;
    params.meshFailurePenaltyDecay = 0;
    params.meshFailurePenaltyWeight = 0;
  }
  params.invalidMessageDeliveriesWeight =
    (-1 * maxPositiveScore) / params.topicWeight;
  params.invalidMessageDeliveriesDecay = scoreParameterDecayFn(
    epochDurationMs * 50
  );
  return params;
}

function scoreParameterDecayWithBase(
  decayTimeMs: number,
  decayIntervalMs: number,
  decayToZero: number
): number {
  const ticks = decayTimeMs / decayIntervalMs;
  return Math.pow(decayToZero, 1 / ticks);
}

function threshold(decay: number, rate: number): number {
  return decayConvergence(decay, rate) * decay;
}

function decayConvergence(decay: number, rate: number): number {
  return rate / (1 - decay);
}
