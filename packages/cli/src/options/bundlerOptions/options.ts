import { ApiOptions } from "types/lib/options/api";
import { ExecutorOptions } from "types/lib/options/executor";

export interface IBundlerOptions {
  api: ApiOptions;
  executor?: ExecutorOptions;
}
