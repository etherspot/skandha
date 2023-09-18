import { defaultExecutorOptions } from "types/lib/options/executor";
import { ICliCommandOptions } from "../../util";
import { IBundlerOptions } from "./options";

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
