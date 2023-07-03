import { ts } from "types/lib";
import { Config } from "executor/lib/config";
import { Executors } from "executor/lib/interfaces";
import { Bytes32 } from "types/lib/primitive/sszTypes";
import { utils } from "ethers";
import { PooledUserOpsByHash } from "types/lib/sszTypes";
import { EncodedPayload, EncodedPayloadType } from "../../../reqresp/types";
import { ResponseError } from "../../../reqresp/response";
import { RespStatus } from "../interface";

export async function* onPooledUserOpsByHash(
  executors: Executors,
  relayersConfig: Config,
  req: ts.PooledUserOpsByHashRequest
): AsyncIterable<EncodedPayload<ts.PooledUserOpsByHash>> {
  const userOpHashes = req.hashes.map((hash) =>
    utils.toUtf8String(Bytes32.fromJson(hash))
  );
  const { supportedNetworks } = relayersConfig;
  const networkName = supportedNetworks.at(0);
  if (!networkName) {
    throw new ResponseError(RespStatus.SERVER_ERROR, "No network found");
  }
  const executor = executors.get(networkName);
  if (!executor) {
    throw new ResponseError(RespStatus.SERVER_ERROR, "Executor not found");
  }
  const userOps = await executor.p2pService.getPooledUserOpsByHash(
    userOpHashes
  );
  yield {
    type: EncodedPayloadType.ssz,
    data: PooledUserOpsByHash.fromJson(userOps),
  };
}
