import { ICliCommand } from "../util/index.js";
import { IGlobalArgs } from "../options/index.js";
import { dev } from "./dev";

export const cmds: Required<
  ICliCommand<IGlobalArgs, Record<never, never>>
>["subcommands"] = [dev];
