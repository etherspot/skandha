import { TopicValidatorResult } from "@libp2p/interface-pubsub";
import { getGossipSSZType } from "../gossip/topic";
import {
  GossipValidatorFn,
  GossipHandlers,
  GossipHandlerFn,
} from "../gossip/interface";
import { GossipActionError } from "../gossip/errors";

// eslint-disable-next-line @typescript-eslint/ban-types
export type ValidatorFnModules = {};

/**
 * Returns a GossipSub validator function from a GossipHandlerFn. GossipHandlerFn may throw GossipActionError if one
 * or more validation conditions from the consensus-specs#p2p-interface are not satisfied.
 *
 * This function receives a string topic and a binary message `InMessage` and deserializes both using caches.
 * - The topic string should be known in advance and pre-computed
 * - The message.data should already by uncompressed when computing its msgID
 *
 * All logging and metrics associated with gossip object validation should happen in this function. We want to know
 * - In debug logs what objects are we processing, the result and some succint metadata
 * - In metrics what's the throughput and ratio of accept/ignore/reject per type
 *
 * @see getGossipHandlers for reasoning on why GossipHandlerFn are used for gossip validation.
 */
export function getGossipValidatorFn(
  gossipHandlers: GossipHandlers,
  _modules: ValidatorFnModules
): GossipValidatorFn {
  return async function gossipValidatorFn(
    topic,
    msg,
    propagationSource,
    seenTimestampSec
  ) {
    const type = topic.type;

    // Define in scope above try {} to be used in catch {} if object was parsed
    let gossipObject;
    try {
      // Deserialize object from bytes ONLY after being picked up from the validation queue
      try {
        const sszType = getGossipSSZType(topic);
        gossipObject = sszType.deserialize(msg.data);
      } catch (e) {
        // TODO: Log the error or do something better with it
        return TopicValidatorResult.Reject;
      }

      await (gossipHandlers[type] as GossipHandlerFn)(
        gossipObject,
        topic,
        propagationSource,
        seenTimestampSec,
        msg.data
      );

      return TopicValidatorResult.Accept;
    } catch (e) {
      if (!(e instanceof GossipActionError)) {
        // logger.debug(
        //   `Gossip validation ${type} threw a non-GossipActionError`,
        //   {},
        //   e as Error
        // );
      }
    }
    return TopicValidatorResult.Ignore;
  };
}
