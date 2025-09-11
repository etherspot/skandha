import { INodeAPI } from "@skandha/types/lib/node";
import { NodeAPIModules } from "./types";
import publishVerifiedUserOperation from "./publishVerifiedUserOperation";
import publishVerifiedUserOperationJSON from "./publishVerifiedUserOperationJSON";
import getConnectedPeers from "./peers";

export function getApi(modules: NodeAPIModules): INodeAPI {
  return {
    publishVerifiedUserOperation: publishVerifiedUserOperation(modules),
    publishVerifiedUserOperationJSON: publishVerifiedUserOperationJSON(modules),
    getConnectedPeers: getConnectedPeers(modules)
  };
}
