import { ssz } from "types/lib";
import * as protocols from "../../../reqresp/protocols";
import { HandlerTypeFromMessage } from "../../../reqresp/types";
import { onStatus } from "./status";

export interface ReqRespHandlers {
  onStatus: HandlerTypeFromMessage<typeof protocols.Status>;
}

export function getReqRespHandlers(): ReqRespHandlers {
  return {
    async *onStatus() {
      yield* onStatus(ssz.Status.defaultValue()); // TODO: change
    },
  };
}
