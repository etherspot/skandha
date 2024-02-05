import { toUserOpsWithEP } from "params/lib/utils/userOp";
import { UserOperationStruct } from "types/lib/contracts/EPv6/EntryPoint";
import { NodeAPIModules } from "./types";

export default function api(modules: NodeAPIModules) {
  return async function publishUserOpsWithEntryPointJSON(
    entryPoint: string,
    chainId: number,
    userOps: UserOperationStruct[],
    blockHash: string
  ): Promise<void> {
    const userOpWithEP = toUserOpsWithEP(
      entryPoint,
      chainId,
      userOps,
      blockHash
    );
    await modules.network.publishUserOpsWithEntryPoint(userOpWithEP);
  };
}
