import { ts } from "..";
import { UserOperationStruct } from "../contracts/EPv6/EntryPoint";

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
