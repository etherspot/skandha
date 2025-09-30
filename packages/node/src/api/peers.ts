import { NodeAPIModules } from "./types.js";

export default function api(modules: NodeAPIModules) {
  return function getConnectedPeers(): unknown[] {
    return modules.network.getConnectedPeerWithInfo();
  };
}
