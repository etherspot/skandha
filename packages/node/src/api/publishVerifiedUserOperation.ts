import { ts } from "@skandha/types/lib/index.js";
import { NodeAPIModules } from "./types.js";

export default function api(modules: NodeAPIModules) {
  return async function publishVerifiedUserOperation(
    userOp: ts.VerifiedUserOperation,
    mempool: string
  ): Promise<void> {
    await modules.network.publishVerifiedUserOperation(userOp, mempool);
  };
}
