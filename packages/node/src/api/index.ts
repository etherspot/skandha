import { INodeAPI } from "types/lib/node";
import { NodeAPIModules } from "./types";
import publishVerifiedUserOperation from "./publishVerifiedUserOperation";
import publishVerifiedUserOperationJSON from "./publishVerifiedUserOperationJSON";

export function getApi(modules: NodeAPIModules): INodeAPI {
  return {
    publishVerifiedUserOperation: publishVerifiedUserOperation(modules),
    publishVerifiedUserOperationJSON: publishVerifiedUserOperationJSON(modules),
  };
}
