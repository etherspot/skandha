import { toVerifiedUserOperation } from "@skandha/params/lib/utils/userOp";
import { UserOperationStruct } from "@skandha/types/lib/contracts/EPv6/EntryPoint";
import { NodeAPIModules } from "./types";

export default function api(modules: NodeAPIModules) {
  return async function publishVerifiedUserOperationJSON(
    entryPoint: string,
    userOp: UserOperationStruct,
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
