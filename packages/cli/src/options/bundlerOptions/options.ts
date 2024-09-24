import { ApiOptions } from "@byzanlink-bundler/types/lib/options/api";
import { ExecutorOptions } from "@byzanlink-bundler/types/lib/options/executor";
import { MetricsOptions } from "@byzanlink-bundler/types/lib/options/metrics";
import { P2POptions } from "@byzanlink-bundler/types/lib/options/network";

export interface IBundlerOptions {
  api: ApiOptions;
  p2p: P2POptions;
  executor: ExecutorOptions;
  metrics: MetricsOptions;
}
