import { NetworkName, ts, ssz } from "types/lib";
import { Config } from "executor/lib/config";
import { Executors } from "executor/lib/interfaces";
import { networksConfig, deserializeMempoolId } from "params/lib";
import { MAX_OPS_PER_REQUEST } from "types/lib/sszTypes";
import { EncodedPayload, EncodedPayloadType } from "../../../reqresp/types";
import { ResponseError } from "../../../reqresp/response";
import { RespStatus } from "../interface";

export async function* onPooledUserOpHashes(
  executors: Executors,
  relayersConfig: Config,
  req: ts.PooledUserOpHashesRequest
): AsyncIterable<EncodedPayload<ts.PooledUserOpHashes>> {
  const { supportedNetworks } = relayersConfig;
  let networkName: NetworkName | null = null;
  for (const network of supportedNetworks) {
    const mempoolIds = networksConfig[network]?.MEMPOOL_IDS;
    if (mempoolIds) {
      for (const mempoolIdHex of mempoolIds) {
        const mempoolId = deserializeMempoolId(mempoolIdHex);
        if (mempoolId == deserializeMempoolId(req.mempool)) {
          networkName = network;
        }
      }
    }
  }
  if (!networkName) {
    throw new ResponseError(RespStatus.INVALID_REQUEST, "Unsupported mempool");
  }
  const executor = executors.get(networkName);
  if (!executor) {
    throw new ResponseError(RespStatus.SERVER_ERROR, "Executor not found");
  }
  const popHashes = await executor.p2pService.getPooledUserOpHashes(
    MAX_OPS_PER_REQUEST,
    Number(req.offset)
  );
  const data = ssz.PooledUserOpHashes.fromJson({
    more_flag: popHashes.more_flag,
    hashes: popHashes,
  });

  yield { type: EncodedPayloadType.ssz, data };
}
