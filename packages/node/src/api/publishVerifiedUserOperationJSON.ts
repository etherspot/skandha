import { toVerifiedUserOperation } from "@skandha/params/lib/utils/userOp";
import { UserOperationStruct } from "@skandha/types/lib/contracts/EPv6/EntryPoint";
import { UserOperation } from "@skandha/types/lib/contracts/UserOperation";
import { NodeAPIModules } from "./types";

export default function api(modules: NodeAPIModules) {
  return async function publishVerifiedUserOperationJSON(
    entryPoint: string,
    userOp: UserOperationStruct,
    blockHash: string,
    mempool: string
  ): Promise<void> {
    const VerifiedUserOperation = toVerifiedUserOperation(
      entryPoint,
      userOp as UserOperation,
      blockHash
    );
    await modules.network.publishVerifiedUserOperation(
      VerifiedUserOperation,
      mempool
    );
  };
}
