import { EventEmitter } from "events";
import { Libp2p } from "libp2p";
import { Message, TopicValidatorResult } from "@libp2p/interface-pubsub";
import StrictEventEmitter from "strict-event-emitter-types";
import { PeerIdStr } from "@chainsafe/libp2p-gossipsub/types";
import { ts } from "types/lib";
import { NetworkEvent } from "../events";

export enum GossipType {
  user_operations_with_entrypoint = "user_operations_with_entrypoint",
}

export enum GossipEncoding {
  ssz_snappy = "ssz_snappy",
}

export interface IGossipTopic {
  type: GossipType;
  mempool: string;
  encoding?: GossipEncoding;
}

export type GossipTopicTypeMap = {
  [GossipType.user_operations_with_entrypoint]: {
    type: GossipType.user_operations_with_entrypoint;
  };
};

export type GossipTopicMap = {
  [K in keyof GossipTopicTypeMap]: GossipTopicTypeMap[K] & IGossipTopic;
};

/**
 * Gossip topic split into a struct
 */
export type GossipTopic = GossipTopicMap[keyof GossipTopicMap];

export type GossipTypeMap = {
  [GossipType.user_operations_with_entrypoint]: ts.UserOpsWithEntryPoint;
};

export type GossipFnByType = {
  [GossipType.user_operations_with_entrypoint]: (
    userOpsWithEP: ts.UserOpsWithEntryPoint
  ) => Promise<void> | void;
};

export type GossipFn = GossipFnByType[keyof GossipFnByType];

export interface IGossipEvents {
  [topicStr: string]: GossipFn;
  [NetworkEvent.gossipHeartbeat]: () => void;
  [NetworkEvent.gossipStart]: () => void;
  [NetworkEvent.gossipStop]: () => void;
}
export type GossipEventEmitter = StrictEventEmitter<
  EventEmitter,
  IGossipEvents
>;

export interface IGossipModules {
  libp2p: Libp2p;
}

/**
 * Contains various methods for validation of incoming gossip topic data.
 * The conditions for valid gossip topics and how they are handled are specified here:
 * https://github.com/ethereum/consensus-specs/blob/v1.1.10/specs/phase0/p2p-interface.md#global-topics
 */

/**
 * Top-level type for gossip validation functions
 *
 * js-libp2p-gossipsub expects validation functions that look like this
 */
export type GossipValidatorFn = (
  topic: GossipTopic,
  msg: Message,
  propagationSource: PeerIdStr,
  seenTimestampSec: number
) => Promise<TopicValidatorResult>;

export type ValidatorFnsByType = { [K in GossipType]: GossipValidatorFn };

export type GossipHandlerFn = (
  object: GossipTypeMap[GossipType],
  topic: GossipTopicMap[GossipType],
  peerIdStr: string,
  seenTimestampSec: number,
  gossipSerializedData: Uint8Array
) => Promise<void>;
export type GossipHandlers = {
  [K in GossipType]: (
    object: GossipTypeMap[K],
    topic: GossipTopicMap[K],
    peerIdStr: string,
    seenTimestampSec: number,
    gossipSerializedData: Uint8Array
  ) => Promise<void>;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type ResolvedType<F extends (...args: any) => Promise<any>> = F extends (
  ...args: any
) => Promise<infer T>
  ? T
  : never;
