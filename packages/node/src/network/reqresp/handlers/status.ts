import { ts } from "types/lib";
import { EncodedPayload, EncodedPayloadType } from "../../../reqresp/types";

export async function* onStatus(
  status: ts.Status
): AsyncIterable<EncodedPayload<ts.Status>> {
  yield { type: EncodedPayloadType.ssz, data: status };
}
