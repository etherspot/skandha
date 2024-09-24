import { ts, ssz } from "@byzanlink-bundler/types/lib";
import { Config } from "@byzanlink-bundler/executor/lib/config";
import { Executor } from "@byzanlink-bundler/executor/lib/executor";
import { MAX_OPS_PER_REQUEST } from "@byzanlink-bundler/types/lib/sszTypes";
import logger from "@byzanlink-bundler/api/lib/logger";
import { userOpHashToBytes } from "@byzanlink-bundler/params/lib/utils/userOp";
import { bytes32ToNumber, numberToBytes32 } from "@byzanlink-bundler/params/lib/utils/cursor";
import { EncodedPayload, EncodedPayloadType } from "../../../reqresp/types";

export async function* onPooledUserOpHashes(
  executor: Executor,
  relayersConfig: Config,
  req: ts.PooledUserOpHashesRequest
): AsyncIterable<EncodedPayload<ts.PooledUserOpHashes>> {
  const pooledUserOpHashes = await executor.p2pService.getPooledUserOpHashes(
    MAX_OPS_PER_REQUEST,
    bytes32ToNumber(req.cursor)
  );

  logger.debug(
    `Sending: ${JSON.stringify(
      {
        next_cursor: pooledUserOpHashes.next_cursor,
        hashes: pooledUserOpHashes.hashes,
      },
      undefined,
      2
    )}`
  );

  const data = ssz.PooledUserOpHashes.defaultValue();
  data.next_cursor = numberToBytes32(pooledUserOpHashes.next_cursor);
  data.hashes = pooledUserOpHashes.hashes.map((hash) =>
    userOpHashToBytes(hash)
  );

  yield { type: EncodedPayloadType.ssz, data };
}
