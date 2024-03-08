import { ts } from "types/lib";
import { NodeAPIModules } from "./types";

export default function api(modules: NodeAPIModules) {
  return async function publishVerifiedUserOperation(
    userOp: ts.VerifiedUserOperation,
    mempool: string
  ): Promise<void> {
    await modules.network.publishVerifiedUserOperation(userOp, mempool);
  };
}
