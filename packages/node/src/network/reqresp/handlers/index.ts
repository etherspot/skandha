import { Config } from "executor/lib/config";
import * as protocols from "../../../reqresp/protocols";
import { HandlerTypeFromMessage } from "../../../reqresp/types";
import { onStatus } from "./status";
export interface ReqRespHandlers {
  onStatus: HandlerTypeFromMessage<typeof protocols.Status>;
  onPooledUserOpHashes: HandlerTypeFromMessage<
    typeof protocols.PooledUserOpHashes
  >;
  onPooledUserOpsByHash: HandlerTypeFromMessage<
    typeof protocols.PooledUserOpsByHash
  >;
}

export function getReqRespHandlers(config: Config): ReqRespHandlers {
  return {
    async *onStatus() {
      yield* onStatus(config);
    },
  };
}
