import { ts } from "types/lib";
import { NodeAPIModules } from "./types";

export default function api(modules: NodeAPIModules) {
  return async function publishUserOpWithEntryPoint(
    userOp: ts.UserOpWithEntryPoint
  ): Promise<void> {
    await modules.network.publishUserOpWithEntryPoint(userOp);
  };
}
