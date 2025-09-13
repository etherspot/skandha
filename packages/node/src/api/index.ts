import { INodeAPI } from "@skandha/types/lib/node";
import { NodeAPIModules } from "./types.js";
import publishVerifiedUserOperation from "./publishVerifiedUserOperation.js";
import publishVerifiedUserOperationJSON from "./publishVerifiedUserOperationJSON.js";
import getConnectedPeers from "./peers.js";

export function getApi(modules: NodeAPIModules): INodeAPI {
  return {
    publishVerifiedUserOperation: publishVerifiedUserOperation(modules),
    publishVerifiedUserOperationJSON: publishVerifiedUserOperationJSON(modules),
    getConnectedPeers: getConnectedPeers(modules)
  };
}
