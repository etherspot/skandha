import { INodeAPI } from "types/lib/node";
import { NodeAPIModules } from "./types";
import publishUserOpWithEntryPoint from "./publishUserOpWithEntryPoint";

export function getApi(modules: NodeAPIModules): INodeAPI {
  return {
    publishUserOpWithEntryPoint: publishUserOpWithEntryPoint(modules),
  };
}
