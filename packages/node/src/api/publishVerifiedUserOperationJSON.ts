import { toVerifiedUserOperation } from "@skandha/params/lib/utils/userOp";
import { UserOperation } from "@skandha/types/lib/contracts/UserOperation";
import { NodeAPIModules } from "./types";

export default function api(modules: NodeAPIModules) {
  return async function publishVerifiedUserOperationJSON(
    entryPoint: string,
    userOp: UserOperation,
    blockHash: string,
    mempool: Uint8Array
  ): Promise<void> {
    const VerifiedUserOperation = toVerifiedUserOperation(
      entryPoint,
      userOp,
      blockHash
    );
    await modules.network.publishVerifiedUserOperation(
      VerifiedUserOperation,
      mempool
    );
  };
}
