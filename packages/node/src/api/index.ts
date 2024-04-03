import { INodeAPI } from "types/lib/node";
import { NodeAPIModules } from "./types";
import publishVerifiedUserOperation from "./publishVerifiedUserOperation";
import publishVerifiedUserOperationJSON from "./publishVerifiedUserOperationJSON";

export function getApi(modules: NodeAPIModules): INodeAPI {
  return {
    publishVerifiedUserOperation: publishVerifiedUserOperation(modules),
    publishVerifiedUserOperationJSON: publishVerifiedUserOperationJSON(modules),
    getPeers() {
      return modules.network.getConnectedPeers().map(peerId => {
        return {
          cid: peerId.toCID().toString(),
          str: peerId.toString(),
          type: peerId.type,
        }
      })
    }
  };
}
