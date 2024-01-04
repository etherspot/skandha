import { ts } from "..";
import { UserOperationStruct } from "../executor/contracts/EntryPoint";

export interface INodeAPI {
  publishVerifiedUserOperation(
    userOpWithEP: ts.VerifiedUserOperation,
    mempool: Uint8Array
  ): Promise<void>;
  publishVerifiedUserOperationJSON(
    entryPoint: string,
    userOps: UserOperationStruct,
    blockHash: string,
    mempool: Uint8Array
  ): Promise<void>;
}
