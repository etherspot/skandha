import { ts } from "..";
import { UserOperationStruct } from "../executor/contracts/EntryPoint";

type PeerInfo = {
  cid: string;
  str: string;
  type: string;
}

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

  getPeers(): PeerInfo[];
}
