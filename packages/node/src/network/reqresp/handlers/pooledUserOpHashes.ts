import { ts, ssz } from "types/lib";
import { Config } from "executor/lib/config";
import { Executors } from "executor/lib/interfaces";
import { networksConfig, deserializeMempoolId } from "params/lib";
import { MAX_OPS_PER_REQUEST } from "types/lib/sszTypes";
import logger from "api/lib/logger";
import { userOpHashToBytes } from "params/lib/utils/userOp";
import { EncodedPayload, EncodedPayloadType } from "../../../reqresp/types";
import { ResponseError } from "../../../reqresp/response";
import { RespStatus } from "../interface";

export async function* onPooledUserOpHashes(
  executors: Executors,
  relayersConfig: Config,
  req: ts.PooledUserOpHashesRequest
): AsyncIterable<EncodedPayload<ts.PooledUserOpHashes>> {
  const { supportedNetworks } = relayersConfig;
  let chainId: number | null = null;
  for (const [_, id] of Object.entries(supportedNetworks)) {
    const mempoolIds = networksConfig[id]?.MEMPOOL_IDS;
    if (mempoolIds) {
      for (const mempoolIdHex of mempoolIds) {
        const mempoolId = deserializeMempoolId(mempoolIdHex);
        if (mempoolId == deserializeMempoolId(req.mempool)) {
          chainId = id;
        }
      }
    }
  }

  if (chainId == null) {
    throw new ResponseError(RespStatus.INVALID_REQUEST, "Unsupported mempool");
  }

  const executor = executors.get(chainId);
  if (!executor) {
    throw new ResponseError(RespStatus.SERVER_ERROR, "Executor not found");
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
