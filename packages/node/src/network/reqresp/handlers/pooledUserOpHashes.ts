import { ts, ssz } from "types/lib";
import { Config } from "executor/lib/config";
import { Executor } from "executor/lib/executor";
import { MAX_OPS_PER_REQUEST } from "types/lib/sszTypes";
import logger from "api/lib/logger";
import { userOpHashToBytes } from "params/lib/utils/userOp";
import { EncodedPayload, EncodedPayloadType } from "../../../reqresp/types";

export async function* onPooledUserOpHashes(
  executor: Executor,
  relayersConfig: Config,
  req: ts.PooledUserOpHashesRequest
): AsyncIterable<EncodedPayload<ts.PooledUserOpHashes>> {
  const pooledUserOpHashes = await executor.p2pService.getPooledUserOpHashes(
    MAX_OPS_PER_REQUEST,
    Number(req.cursor)
  );

  logger.debug(
    `Sending: ${JSON.stringify(
      {
        next_cursor: Number(pooledUserOpHashes.next_cursor),
        hashes: pooledUserOpHashes.hashes,
      },
      undefined,
      2
    )}`
  );

  const data = ssz.PooledUserOpHashes.defaultValue();
  data.next_cursor = BigInt(pooledUserOpHashes.next_cursor);
  data.hashes = pooledUserOpHashes.hashes.map((hash) =>
    userOpHashToBytes(hash)
  );

  yield { type: EncodedPayloadType.ssz, data };
}
