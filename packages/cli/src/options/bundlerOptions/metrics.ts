import { defaultMetricsOptions } from "types/lib/options/metrics";
import { ICliCommandOptions } from "../../util";
import { IBundlerOptions } from "./options";

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
