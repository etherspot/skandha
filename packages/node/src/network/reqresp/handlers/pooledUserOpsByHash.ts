import { NetworkName, ts, ssz } from "types/lib";
import { Config } from "executor/lib/config";
import { Executors } from "executor/lib/interfaces";
import { networksConfig } from "params/lib";
import { MAX_OPS_PER_REQUEST } from "types/src/sszTypes";
import { EncodedPayload, EncodedPayloadType } from "../../../reqresp/types";
import { ResponseError } from "../../../reqresp/response";
import { RespStatus } from "../interface";

export async function* onPooledUserOpsByHash(
  executors: Executors,
  relayersConfig: Config,
  req: ts.PooledUserOpsByHashRequest
): AsyncIterable<EncodedPayload<ts.PooledUserOpsByHash>> {
  const userOpHashes = req.hashes.map(hash => )
  yield {} as any;
}
