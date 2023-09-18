import { ApiOptions } from "types/lib/options/api";
import { ExecutorOptions } from "types/lib/options/executor";
import { P2POptions } from "types/lib/options/network";

export interface IBundlerOptions {
  api: ApiOptions;
  p2p: P2POptions;
  executor: ExecutorOptions;
}
