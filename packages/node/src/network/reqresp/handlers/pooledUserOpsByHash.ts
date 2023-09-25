import { ts } from "types/lib";
import { Config } from "executor/lib/config";
import { Executors } from "executor/lib/interfaces";
import { serializeUserOp, userOpHashToString } from "params/lib/utils/userOp";
import logger from "api/lib/logger";
import { EncodedPayload, EncodedPayloadType } from "../../../reqresp/types";
import { ResponseError } from "../../../reqresp/response";
import { RespStatus } from "../interface";

export async function* onPooledUserOpsByHash(
  executors: Executors,
  relayersConfig: Config,
  req: ts.PooledUserOpsByHashRequest
): AsyncIterable<EncodedPayload<ts.PooledUserOpsByHash>> {
  const userOpHashes = req.hashes.map((hash) => userOpHashToString(hash));
  logger.debug(`UserOpsByHash, received hashes: ${userOpHashes.join(", ")}`);
  const { supportedNetworks } = relayersConfig;
  const chainId = Object.values(supportedNetworks).at(0); // OK: any network works
  // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
  if (!chainId) {
    throw new ResponseError(RespStatus.SERVER_ERROR, "No network found");
  }
  const executor = executors.get(chainId);
  if (!executor) {
    throw new ResponseError(RespStatus.SERVER_ERROR, "Executor not found");
  }
  const userOps = await executor.p2pService.getPooledUserOpsByHash(
    userOpHashes
  );

  logger.debug(`UserOpsByHash, found userops: ${userOps.length}`);

  const sszUserOps = userOps.map((userOp) => serializeUserOp(userOp));

  yield {
    type: EncodedPayloadType.ssz,
    data: sszUserOps,
  };
}
