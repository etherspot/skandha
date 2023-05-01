/* eslint-disable @typescript-eslint/no-unused-vars */
import { ts } from "types/lib";
import { GossipHandlers, GossipType } from "../gossip/interface";
import { validateGossipUserOpWithEntryPoint } from "../validation";
import { NetworkEventBus } from "../events";

export type ValidatorFnsModules = {
  events: NetworkEventBus;
};

/**
 * Gossip handlers perform validation + handling in a single function.
 * - This gossip handlers MUST only be registered as validator functions. No handler is registered for any topic.
 * - All `chain/validation/*` functions MUST throw typed GossipActionError instances so they gossip action is captured
 *   by `getGossipValidatorFn()` try catch block.
 * - This gossip handlers should not let any handling errors propagate to the caller. Only validation errors must be thrown.
 *
 * Note: `libp2p/js-libp2p-interfaces` would normally indicate to register separate validator functions and handler functions.
 * This approach is not suitable for us because:
 * - We do expensive processing on the object in the validator function that we need to re-use in the handler function.
 * - The validator function produces extra data that is needed for the handler function. Making this data available in
 *   the handler function scope is hard to achieve without very hacky strategies
 * - Ethereum Consensus gossipsub protocol strictly defined a single topic for message
 */
export function getGossipHandlers(
  modules: ValidatorFnsModules
): GossipHandlers {
  const { events } = modules;

  async function validateUserOpWithEntryPoint(
    userOp: ts.UserOpWithEntryPoint,
    peerIdStr: string,
    seenTimestampSec: number
  ): Promise<void> {
    await validateGossipUserOpWithEntryPoint(userOp);
  }

  function handleValidUserOpWithEntryPoint(
    userOp: ts.UserOpWithEntryPoint,
    peerIdStr: string,
    seenTimestampSec: number
  ): void {
    // TODO: process user op
  }

  return {
    [GossipType.user_operations_with_entrypoint]: async (
      userOp,
      topic,
      peerIdStr,
      seenTimestampSec
    ) => {
      await validateUserOpWithEntryPoint(userOp, peerIdStr, seenTimestampSec);
      handleValidUserOpWithEntryPoint(userOp, peerIdStr, seenTimestampSec);
    },
  };
}

/**
 * Retry a function if it throws error code UNKNOWN_OR_PREFINALIZED_BEACON_BLOCK_ROOT
 */
export async function validateGossipFnRetryUnknownRoot<T>(
  fn: () => Promise<T>
): Promise<T> {
  // eslint-disable-next-line no-constant-condition
  while (true) {
    return await fn();
  }
}
