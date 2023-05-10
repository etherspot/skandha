import { ts } from "..";

export interface INodeAPI {
  publishUserOpWithEntryPoint(
    userOpWithEP: ts.UserOpWithEntryPoint
  ): Promise<void>;
}
