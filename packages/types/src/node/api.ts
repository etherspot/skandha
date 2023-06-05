import { ts } from "..";
import { UserOperationStruct } from "../executor/contracts/EntryPoint";

export interface INodeAPI {
  publishUserOpsWithEntryPoint(
    userOpWithEP: ts.UserOpsWithEntryPoint
  ): Promise<void>;
  publishUserOpsWithEntryPointJSON(
    entryPoint: string,
    chainId: number,
    userOps: UserOperationStruct[],
    blockHash: string
  ): Promise<void>;
}
