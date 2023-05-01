import { NetworkEvent, NetworkEventBus } from "../events";
import { GossipHandlers, GossipValidatorFn } from "../gossip/interface";
import { getGossipHandlers, ValidatorFnsModules } from "./gossipHandlers";
import { getGossipValidatorFn, ValidatorFnModules } from "./gossipValidatorFn";
import { PendingGossipsubMessage } from "./types";

export type NetworkWorkerModules = ValidatorFnsModules &
  ValidatorFnModules & {
    events: NetworkEventBus;
    // Optionally pass custom GossipHandlers, for testing
    gossipHandlers?: GossipHandlers;
  };

export class NetworkWorker {
  private readonly events: NetworkEventBus;
  private readonly gossipValidatorFn: GossipValidatorFn;

  constructor(modules: NetworkWorkerModules) {
    this.events = modules.events;
    this.gossipValidatorFn = getGossipValidatorFn(
      modules.gossipHandlers ?? getGossipHandlers(modules),
      modules
    );
  }

  async processPendingGossipsubMessage(
    message: PendingGossipsubMessage
  ): Promise<void> {
    message.startProcessUnixSec = Date.now() / 1000;

    const acceptance = await this.gossipValidatorFn(
      message.topic,
      message.msg,
      message.propagationSource.toString(),
      message.seenTimestampSec
    );

    // Use setTimeout to yield to the macro queue
    // This is mostly due to too many attestation messages, and a gossipsub RPC may
    // contain multiple of them. This helps avoid the I/O lag issue.
    setTimeout(
      () =>
        this.events.emit(
          NetworkEvent.gossipMessageValidationResult,
          message.msgId,
          message.propagationSource,
          acceptance
        ),
      0
    );
  }
}
