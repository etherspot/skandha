import { ssz, ts } from "types/lib";
import {
  ContextBytesType,
  DuplexProtocolDefinitionGenerator,
  Encoding,
} from "../types";

export const PooledUserOpsByHash: DuplexProtocolDefinitionGenerator<
  ts.PooledUserOpsByHashRequest,
  ts.PooledUserOpsByHash
> = (modules, handler) => {
  return {
    method: "pooled_user_ops_by_hash",
    version: 1,
    encoding: Encoding.SSZ_SNAPPY,
    requestType: () => ssz.PooledUserOpsByHashRequest,
    responseType: () => ssz.PooledUserOpsByHash,
    contextBytes: { type: ContextBytesType.Empty },
    handler,
    inboundRateLimits: {
      byPeer: { quota: 5, quotaTimeMs: 15_000 },
    },
  };
};
