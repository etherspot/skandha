import { defaultMetricsOptions } from "@skandha/types/lib/options/metrics.js";
import { ICliCommandOptions } from "../../util/index.js";
import { IBundlerOptions } from "./options.js";

export interface IMetricsArgs {
  "metrics.enable": boolean;
  "metrics.host": string;
  "metrics.port": number;
}

export function parseArgs(args: IMetricsArgs): IBundlerOptions["metrics"] {
  return {
    enable: args["metrics.enable"],
    host: args["metrics.host"],
    port: args["metrics.port"],
  };
}

export const options: ICliCommandOptions<IMetricsArgs> = {
  "metrics.enable": {
    type: "boolean",
    description: "Enable monitoring",
    default: defaultMetricsOptions.enable,
    group: "metrics",
    demandOption: false,
  },
  "metrics.host": {
    type: "string",
    description: "Metrics host",
    default: defaultMetricsOptions.host,
    group: "metrics",
    demandOption: false,
  },
  "metrics.port": {
    type: "number",
    description: "Metrics port",
    default: defaultMetricsOptions.port,
    group: "metrics",
    demandOption: false,
  },
};
