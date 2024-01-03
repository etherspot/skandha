import { ts } from "..";
import { UserOperationStruct } from "../executor/contracts/EntryPoint";

export interface INodeAPI {
  publishVerifiedUserOperation(
    userOpWithEP: ts.VerifiedUserOperation
  ): Promise<void>;
  publishVerifiedUserOperationJSON(
    entryPoint: string,
    userOps: UserOperationStruct,
    blockHash: string
  ): Promise<void>;
}
