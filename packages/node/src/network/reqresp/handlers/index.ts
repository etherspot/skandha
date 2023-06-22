import { Config } from "executor/lib/config";
import { Executors } from "executor/lib/interfaces";
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
  executors: Executors,
  config: Config
): ReqRespHandlers {
  return {
    async *onStatus() {
      yield* onStatus(config);
    },
    async *onPooledUserOpHashes(req) {
      yield* onPooledUserOpHashes(executors, config, req);
    },
    async *onPooledUserOpsByHash(req) {
      yield* onPooledUserOpsByHash(executors, config, req);
    },
  };
}
