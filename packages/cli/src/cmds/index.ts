import { ICliCommand } from "../util/index.js";
import { IGlobalArgs } from "../options/index.js";
import { start } from "./dev";

export const cmds: Required<
  ICliCommand<IGlobalArgs, Record<never, never>>
>["subcommands"] = [start];
