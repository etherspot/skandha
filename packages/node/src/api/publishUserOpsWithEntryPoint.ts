import { ts } from "types/lib";
import { NodeAPIModules } from "./types";

export default function api(modules: NodeAPIModules) {
  return async function publishUserOpsWithEntryPoint(
    userOp: ts.UserOpsWithEntryPoint
  ): Promise<void> {
    await modules.network.publishUserOpsWithEntryPoint(userOp);
  };
}
