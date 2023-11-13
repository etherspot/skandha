/* eslint-disable @typescript-eslint/no-unused-vars */
import { ts, NetworkName } from "types/lib";
import logger from "api/lib/logger";
import { Config } from "executor/lib/config";
import { Executors } from "executor/lib/interfaces";
import { deserializeUserOpsWithEP } from "params/lib/utils/userOp";
import { AllChainsMetrics } from "monitoring/lib";
import { GossipHandlers, GossipType } from "../gossip/interface";
import { validateGossipUserOpsWithEntryPoint } from "../validation";
import { NetworkEventBus } from "../events";
import { GossipValidationError } from "../gossip/errors";

export type ValidatorFnsModules = {
  relayersConfig: Config;
  events: NetworkEventBus;
  executors: Executors;
  metrics: AllChainsMetrics | null;
};

export function getGossipHandlers(
  modules: ValidatorFnsModules
): GossipHandlers {
  const { relayersConfig, executors } = modules;
  async function validateUserOpsWithEntryPoint(
    userOp: ts.UserOpsWithEntryPoint,
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
      await validateGossipUserOpsWithEntryPoint(relayersConfig, userOp);
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

  async function handleValidUserOpsWithEntryPoint(
    userOpsWithEP: ts.UserOpsWithEntryPoint,
    mempool: string,
    peerIdStr: string,
    seenTimestampSec: number
  ): Promise<void> {
    const { entryPoint, chainId, userOps } =
      deserializeUserOpsWithEP(userOpsWithEP);
    const executor = executors.get(chainId);
    if (!executor) {
      logger.error(`Executor for ${chainId} not found`);
      return;
    }
    for (const userOp of userOps) {
      try {
        const isNewOrReplacing =
          await executor.p2pService.isNewOrReplacingUserOp(userOp, entryPoint);
        if (!isNewOrReplacing) {
          logger.debug(
            `[${userOp.sender}, ${userOp.nonce.toString()}] exists, skipping...`
          );
          continue;
        }
        const userOpHash = await executor.eth.sendUserOperation({
          userOp,
          entryPoint,
        });
        logger.debug(`Processed userOp: ${userOpHash}`);
        if (modules.metrics) {
          modules.metrics[chainId].useropsReceived?.inc();
        }
      } catch (err) {
        logger.error(`Could not process userOp: ${err}`);
      }
    }
  }

  return {
    [GossipType.user_operations_with_entrypoint]: async (
      userOp,
      topic,
      peerIdStr,
      seenTimestampSec
    ) => {
      if (
        await validateUserOpsWithEntryPoint(
          userOp,
          topic.mempool,
          peerIdStr,
          seenTimestampSec
        )
      ) {
        await handleValidUserOpsWithEntryPoint(
          userOp,
          topic.mempool,
          peerIdStr,
          seenTimestampSec
        );
      }
    },
  };
}
