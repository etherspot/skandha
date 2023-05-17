/* eslint-disable @typescript-eslint/no-unused-vars */
import { ts } from "types/lib";
import logger from "api/lib/logger";
import { Config } from "executor/lib/config";
import { GossipHandlers, GossipType } from "../gossip/interface";
import { validateGossipUserOpWithEntryPoint } from "../validation";
import { NetworkEventBus } from "../events";
import { GossipValidationError } from "../gossip/errors";

export type ValidatorFnsModules = {
  relayersConfig: Config;
  events: NetworkEventBus;
};

export function getGossipHandlers(
  modules: ValidatorFnsModules
): GossipHandlers {
  const { events } = modules;

  async function validateUserOpWithEntryPoint(
    userOp: ts.UserOpWithEntryPoint,
    mempool: string,
    peerIdStr: string,
    seenTimestampSec: number
  ): Promise<boolean> {
    logger.info(
      {
        userOp,
        mempool,
        peerIdStr,
        seenTimestampSec,
      },
      "Received gossip block"
    );
    try {
      await validateGossipUserOpWithEntryPoint(modules.relayersConfig, userOp);
      return true;
    } catch (err) {
      if (err instanceof GossipValidationError) {
        logger.debug(`${err.code}: ${err.message}`);
      }
      logger.debug(err);
      return false;
    }
  }

  function handleValidUserOpWithEntryPoint(
    userOp: ts.UserOpWithEntryPoint,
    mempool: string,
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
      if (
        await validateUserOpWithEntryPoint(
          userOp,
          topic.mempool,
          peerIdStr,
          seenTimestampSec
        )
      ) {
        handleValidUserOpWithEntryPoint(
          userOp,
          topic.mempool,
          peerIdStr,
          seenTimestampSec
        );
      }
    },
  };
}
