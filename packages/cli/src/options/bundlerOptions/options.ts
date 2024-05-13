import { ApiOptions } from "@skandha/types/lib/options/api";
import { ExecutorOptions } from "@skandha/types/lib/options/executor";
import { MetricsOptions } from "@skandha/types/lib/options/metrics";
import { P2POptions } from "@skandha/types/lib/options/network";

export interface IBundlerOptions {
  api: ApiOptions;
  p2p: P2POptions;
  executor: ExecutorOptions;
  metrics: MetricsOptions;
}
