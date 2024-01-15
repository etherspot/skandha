import { ts, ssz } from "types/lib";
import { Config } from "executor/lib/config";
import { Executor } from "executor/lib/executor";
import { networksConfig, deserializeMempoolId } from "params/lib";
import { MAX_OPS_PER_REQUEST } from "types/lib/sszTypes";
import logger from "api/lib/logger";
import { userOpHashToBytes } from "params/lib/utils/userOp";
import { EncodedPayload, EncodedPayloadType } from "../../../reqresp/types";
import { ResponseError } from "../../../reqresp/response";
import { RespStatus } from "../interface";

export async function* onPooledUserOpHashes(
  executor: Executor,
  relayersConfig: Config,
  req: ts.PooledUserOpHashesRequest
): AsyncIterable<EncodedPayload<ts.PooledUserOpHashes>> {
  const mempoolIds = networksConfig[relayersConfig.chainId]?.MEMPOOL_IDS;
  if (
    !mempoolIds ||
    !mempoolIds.some(
      (mempoolIdHex) =>
        deserializeMempoolId(mempoolIdHex) ==
          deserializeMempoolId(req.mempool) ||
        deserializeMempoolId(req.mempool) ==
          relayersConfig.config.canonicalMempoolId
    )
  ) {
    throw new ResponseError(RespStatus.INVALID_REQUEST, "Unsupported mempool");
  }

  const pooledUserOpHashes = await executor.p2pService.getPooledUserOpHashes(
    MAX_OPS_PER_REQUEST,
    Number(req.offset)
  );

  logger.debug(
    `Sending: ${JSON.stringify(
      {
        more_flag: Number(pooledUserOpHashes.more_flag),
        hashes: pooledUserOpHashes.hashes,
      },
      undefined,
      2
    )}`
  );

  const data = ssz.PooledUserOpHashes.defaultValue();
  data.more_flag = BigInt(pooledUserOpHashes.more_flag);
  data.hashes = pooledUserOpHashes.hashes.map((hash) =>
    userOpHashToBytes(hash)
  );

  yield { type: EncodedPayloadType.ssz, data };
}
