/* eslint-disable @typescript-eslint/no-unused-vars */
import { ts } from "@skandha/types/lib";
import logger from "@skandha/api/lib/logger";
import { Config } from "@skandha/executor/lib/config";
import { deserializeVerifiedUserOperation } from "@skandha/params/lib/utils/userOp";
import { AllChainsMetrics } from "@skandha/monitoring/lib";
import { Executor } from "@skandha/executor/lib/executor";
import { GossipHandlers, GossipType } from "../gossip/interface";
import { validateGossipVerifiedUserOperation } from "../validation";
import { NetworkEventBus } from "../events";
import { GossipValidationError } from "../gossip/errors";

export type ValidatorFnsModules = {
  relayersConfig: Config;
  events: NetworkEventBus;
  executor: Executor;
  metrics: AllChainsMetrics | null;
};

export function getGossipHandlers(
  modules: ValidatorFnsModules
): GossipHandlers {
  const { relayersConfig, executor } = modules;
  async function validateVerifiedUserOperation(
    userOp: ts.VerifiedUserOperation,
    mempool: string,
    peerIdStr: string,
    seenTimestampSec: number
  ): Promise<boolean> {
    logger.info(
      {
        mempool,
        peerIdStr,
        seenTimestampSec,
      },
      "Received gossip block"
    );
    try {
      await validateGossipVerifiedUserOperation(relayersConfig, userOp);
      logger.debug("Validation successful");
      return true;
    } catch (err) {
      if (err instanceof GossipValidationError) {
        logger.debug(`${err.code}: ${err.message}`);
      } else {
        logger.debug(err);
      }
      return false;
    }
  }

  async function handleValidVerifiedUserOperation(
    verifiedUserOp: ts.VerifiedUserOperation,
    mempool: string,
    peerIdStr: string,
    seenTimestampSec: number
  ): Promise<void> {
    const { entryPoint, userOp } =
      deserializeVerifiedUserOperation(verifiedUserOp);
    try {
      const isNewOrReplacing = await executor.p2pService.isNewOrReplacingUserOp(
        userOp,
        entryPoint
      );
      if (!isNewOrReplacing) {
        logger.debug(
          `[${userOp.sender}, ${userOp.nonce.toString()}] exists, skipping...`
        );
        return;
      }
      const userOpHash = await executor.eth.sendUserOperation({
        userOp,
        entryPoint,
      });
      logger.debug(`Processed userOp: ${userOpHash}`);
      if (modules.metrics) {
        modules.metrics[executor.chainId].useropsReceived?.inc();
      }
    } catch (err) {
      logger.error(`Could not process userOp: ${err}`);
    }
    return; // TODO: remove
  }

  return {
    [GossipType.user_operation]: async (
      userOp,
      topic,
      peerIdStr,
      seenTimestampSec
    ) => {
      if (
        await validateVerifiedUserOperation(
          userOp,
          topic.mempool,
          peerIdStr,
          seenTimestampSec
        )
      ) {
        await handleValidVerifiedUserOperation(
          userOp,
          topic.mempool,
          peerIdStr,
          seenTimestampSec
        );
      }
    },
  };
}
