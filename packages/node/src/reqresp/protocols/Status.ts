import { ssz, ts } from "@skandha/types/lib";
import { MAX_MEMPOOLS_PER_BUNDLER } from "@skandha/types/lib/sszTypes";
import {
  ContextBytesType,
  DialOnlyProtocolDefinition,
  Encoding,
  MixedProtocolDefinitionGenerator,
} from "../types";

// eslint-disable-next-line @typescript-eslint/naming-convention
export const Status: MixedProtocolDefinitionGenerator<ts.Status, ts.Status> = ((
  _modules,
  handler
) => {
  const dialProtocol: DialOnlyProtocolDefinition<ts.Status, ts.Status> = {
    method: "status",
    version: 1,
    encoding: Encoding.SSZ_SNAPPY,
    requestType: () => ssz.Status,
    responseType: () => ssz.Status,
    contextBytes: { type: ContextBytesType.Empty },
  };

  if (!handler) return dialProtocol;

  return {
    ...dialProtocol,
    handler,
    inboundRateLimits: {
      // Rationale: https://github.com/sigp/lighthouse/blob/bf533c8e42cc73c35730e285c21df8add0195369/beacon_node/lighthouse_network/src/rpc/mod.rs#L118-L130
      byPeer: { quota: MAX_MEMPOOLS_PER_BUNDLER, quotaTimeMs: 15_000 },
    },
  };
}) as MixedProtocolDefinitionGenerator<ts.Status, ts.Status>;
