import { Executor } from "@skandha/executor/lib/executor";
import { Config } from "@skandha/executor/lib/config";
import { ts } from "@skandha/types/lib";
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
