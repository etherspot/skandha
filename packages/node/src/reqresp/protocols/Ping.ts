import { ssz, ts } from "@byzanlink-bundler/types/lib";
import {
  ContextBytesType,
  Encoding,
  ProtocolDefinition,
  ReqRespHandler,
} from "../types";

// eslint-disable-next-line @typescript-eslint/naming-convention
export function Ping(
  handler: ReqRespHandler<ts.Ping, ts.Ping>
): ProtocolDefinition<ts.Ping, ts.Ping> {
  return {
    method: "ping",
    version: 1,
    encoding: Encoding.SSZ_SNAPPY,
    handler,
    requestType: () => ssz.Ping,
    responseType: () => ssz.Ping,
    renderRequestBody: (req: bigint) => req.toString(10),
    contextBytes: { type: ContextBytesType.Empty },
    inboundRateLimits: {
      // Rationale: https://github.com/sigp/lighthouse/blob/bf533c8e42cc73c35730e285c21df8add0195369/beacon_node/lighthouse_network/src/rpc/mod.rs#L118-L130
      byPeer: { quota: 2, quotaTimeMs: 10_000 },
    },
  };
}
