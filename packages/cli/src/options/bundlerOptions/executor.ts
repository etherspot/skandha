import { defaultExecutorOptions } from "@skandha/types/lib/options/executor.js";
import { ICliCommandOptions } from "../../util/index.js";
import { IBundlerOptions } from "./options.js";

export interface IExecutorArgs {
  "executor.bundlingMode": "auto" | "manual";
}

export function parseArgs(args: IExecutorArgs): IBundlerOptions["executor"] {
  return {
    bundlingMode: args["executor.bundlingMode"],
  };
}

export const options: ICliCommandOptions<IExecutorArgs> = {
  "executor.bundlingMode": {
    type: "string",
    description: "Default bundling mode",
    default: defaultExecutorOptions.bundlingMode,
    group: "executor",
    demandOption: false,
  },
};
