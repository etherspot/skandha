import { ts, ssz } from "@skandha/types/lib";
import { Config } from "@skandha/executor/lib/config";
import { Executor } from "@skandha/executor/lib/executor";
import { MAX_OPS_PER_REQUEST } from "@skandha/types/lib/sszTypes";
import logger from "@skandha/api/lib/logger";
import { userOpHashToBytes } from "@skandha/params/lib/utils/userOp";
import { bytes32ToNumber, numberToBytes32 } from "@skandha/params/lib/utils/cursor";
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
