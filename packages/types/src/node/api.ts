import { ts } from "..";

export interface INodeAPI {
  publishUserOpsWithEntryPoint(
    userOpWithEP: ts.UserOpsWithEntryPoint
  ): Promise<void>;
}
