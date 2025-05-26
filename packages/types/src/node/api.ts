import { ts } from "..";
import { UserOperationStruct } from "../contracts/EPv6/EntryPoint";

export interface INodeAPI {
  publishVerifiedUserOperation(
    userOpWithEP: ts.VerifiedUserOperation,
    mempool: string
  ): Promise<void>;
  publishVerifiedUserOperationJSON(
    entryPoint: string,
    userOp: UserOperationStruct,
    blockHash: string,
    mempool: string
  ): Promise<void>;
}
