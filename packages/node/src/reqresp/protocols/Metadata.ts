import { ssz, ts } from "types/lib";
import {
  ContextBytesType,
  DuplexProtocolDefinitionGenerator,
  Encoding,
  MixedProtocolDefinition,
} from "../types";

/* eslint-disable @typescript-eslint/naming-convention */
const MetadataCommon: Pick<
  MixedProtocolDefinition<null, ts.Metadata>,
  | "method"
  | "encoding"
  | "requestType"
  | "renderRequestBody"
  | "inboundRateLimits"
> = {
  method: "metadata",
  encoding: Encoding.SSZ_SNAPPY,
  requestType: () => null,
  inboundRateLimits: {
    // Rationale: https://github.com/sigp/lighthouse/blob/bf533c8e42cc73c35730e285c21df8add0195369/beacon_node/lighthouse_network/src/rpc/mod.rs#L118-L130
    byPeer: { quota: 2, quotaTimeMs: 5_000 },
  },
};

export const Metadata: DuplexProtocolDefinitionGenerator<null, ts.Metadata> = (
  modules,
  handler
) => {
  return {
    ...MetadataCommon,
    version: 1,
    handler,
    responseType: () => ssz.Metadata,
    contextBytes: { type: ContextBytesType.Empty },
  };
};
