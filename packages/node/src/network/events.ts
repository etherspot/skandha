import { EventEmitter } from "events";
import { PeerId } from "@libp2p/interface-peer-id";
import StrictEventEmitter from "strict-event-emitter-types";
import { ts } from "types/lib";
import { TopicValidatorResult } from "@libp2p/interface-pubsub";
import { RequestTypedContainer } from "./reqresp";
import { PendingGossipsubMessage } from "./processor/types";

export enum NetworkEvent {
  peerConnected = "peer-manager.peer-connected",
  peerDisconnected = "peer-manager.peer-disconnected",
  gossipStart = "gossip.start",
  gossipStop = "gossip.stop",
  gossipHeartbeat = "gossipsub.heartbeat",
  reqRespRequest = "req-resp.request",

  // Network processor events
  pendingGossipsubMessage = "gossip.pendingGossipsubMessage",
  gossipMessageValidationResult = "gossip.messageValidationResult",
}

export type NetworkEvents = {
  [NetworkEvent.peerConnected]: (peer: PeerId, status: ts.Status) => void;
  [NetworkEvent.peerDisconnected]: (peer: PeerId) => void;
  [NetworkEvent.reqRespRequest]: (
    request: RequestTypedContainer,
    peer: PeerId
  ) => void;
  [NetworkEvent.pendingGossipsubMessage]: (
    data: PendingGossipsubMessage
  ) => void;
  [NetworkEvent.gossipMessageValidationResult]: (
    msgId: string,
    propagationSource: PeerId,
    acceptance: TopicValidatorResult
  ) => void;
};

export type INetworkEventBus = StrictEventEmitter<EventEmitter, NetworkEvents>;

export class NetworkEventBus extends (EventEmitter as {
  new (): INetworkEventBus;
}) {}
