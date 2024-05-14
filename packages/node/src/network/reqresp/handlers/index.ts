import { Config } from "@skandha/executor/lib/config";
import { Executor } from "@skandha/executor/lib/executor";
import { AllChainsMetrics } from "@skandha/monitoring/lib";
import * as protocols from "../../../reqresp/protocols";
import { HandlerTypeFromMessage } from "../../../reqresp/types";
import { onStatus } from "./status";
import { onPooledUserOpHashes } from "./pooledUserOpHashes";
import { onPooledUserOpsByHash } from "./pooledUserOpsByHash";

export interface ReqRespHandlers {
  onStatus: HandlerTypeFromMessage<typeof protocols.Status>;
  onPooledUserOpHashes: HandlerTypeFromMessage<
    typeof protocols.PooledUserOpHashes
  >;
  onPooledUserOpsByHash: HandlerTypeFromMessage<
    typeof protocols.PooledUserOpsByHash
  >;
}

export function getReqRespHandlers(
  executor: Executor,
  config: Config,
  metrics: AllChainsMetrics | null
): ReqRespHandlers {
  return {
    async *onStatus() {
      yield* onStatus(config);
    },
    async *onPooledUserOpHashes(req) {
      yield* onPooledUserOpHashes(executor, config, req);
    },
    async *onPooledUserOpsByHash(req) {
      yield* onPooledUserOpsByHash(executor, config, req, metrics);
    },
  };
}
