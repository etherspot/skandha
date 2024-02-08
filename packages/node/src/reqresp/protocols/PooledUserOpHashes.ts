import { ssz, ts } from "types/lib";
import {
  ContextBytesType,
  DuplexProtocolDefinitionGenerator,
  Encoding,
} from "../types";

export const PooledUserOpHashes: DuplexProtocolDefinitionGenerator<
  ts.PooledUserOpHashesRequest,
  ts.PooledUserOpHashes
> = (modules, handler) => {
  return {
    method: "pooled_user_op_hashes",
    version: 1,
    encoding: Encoding.SSZ_SNAPPY,
    requestType: () => ssz.PooledUserOpHashesRequest,
    responseType: () => ssz.PooledUserOpHashes,
    contextBytes: { type: ContextBytesType.Empty },
    handler,
    inboundRateLimits: {
      byPeer: { quota: 5, quotaTimeMs: 15_000 },
    },
  };
};
