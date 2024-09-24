import { Executor } from "@byzanlink-bundler/executor/lib/executor";
import { Config } from "@byzanlink-bundler/executor/lib/config";
import { ts } from "@byzanlink-bundler/types/lib";
import { PeerId } from "@libp2p/interface-peer-id";
import { IReqRespNode } from "./interface";

export async function pooledUserOpHashes(
  reqResp: IReqRespNode,
  peerId: PeerId,
  executor: Executor,
  relayersConfig: Config,
  req: ts.PooledUserOpHashesRequest
): Promise<ts.PooledUserOpHashes> {
  return await reqResp.pooledUserOpHashes(peerId, req);
}
