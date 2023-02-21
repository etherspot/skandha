import { ICliCommand } from "../util";
import { IGlobalArgs } from "../options";
import { start } from "./start";

export const cmds: Required<
  ICliCommand<IGlobalArgs, Record<never, never>>
>["subcommands"] = [start];
