import { ApiOptions } from "@skandha/types/lib/options/api.js";
import { ExecutorOptions } from "@skandha/types/lib/options/executor.js";
import { MetricsOptions } from "@skandha/types/lib/options/metrics.js";
import { P2POptions } from "@skandha/types/lib/options/network.js";

export interface IBundlerOptions {
  api: ApiOptions;
  p2p: P2POptions;
  executor: ExecutorOptions;
  metrics: MetricsOptions;
}
