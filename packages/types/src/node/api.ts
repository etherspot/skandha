import { ts } from "..";
import { UserOperationStruct } from "../executor/contracts/EntryPoint";

export interface INodeAPI {
  publishVerifiedUserOperation(
    userOpWithEP: ts.VerifiedUserOperation,
    mempool: Uint8Array
  ): Promise<void>;
  publishVerifiedUserOperationJSON(
    entryPoint: string,
    userOp: UserOperationStruct,
    blockHash: string,
    mempool: Uint8Array
  ): Promise<void>;
}
