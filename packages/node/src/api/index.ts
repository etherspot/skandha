import { INodeAPI } from "types/lib/node";
import { NodeAPIModules } from "./types";
import publishUserOpsWithEntryPoint from "./publishUserOpsWithEntryPoint";
import publishUserOpsWithEntryPointJSON from "./publishUserOpsWithEntryPointJSON";

export function getApi(modules: NodeAPIModules): INodeAPI {
  return {
    publishUserOpsWithEntryPoint: publishUserOpsWithEntryPoint(modules),
    publishUserOpsWithEntryPointJSON: publishUserOpsWithEntryPointJSON(modules),
  };
}
