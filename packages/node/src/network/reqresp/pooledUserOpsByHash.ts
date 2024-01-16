import { Executor } from "executor/lib/executor";
import { Config } from "executor/lib/config";
import { ts } from "types/lib";
import { PeerId } from "@libp2p/interface-peer-id";
import { IReqRespNode } from "./interface";

export async function pooledUserOpsByHash(
  reqResp: IReqRespNode,
  peerId: PeerId,
  executor: Executor,
  relayersConfig: Config,
  req: ts.PooledUserOpsByHashRequest
): Promise<ts.PooledUserOpsByHash> {
  return await reqResp.pooledUserOpsByHash(peerId, req);
}
