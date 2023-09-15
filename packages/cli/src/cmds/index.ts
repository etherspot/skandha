import { ICliCommand } from "../util";
import { IGlobalArgs } from "../options";
import { standalone } from "./standalone";
import { node } from "./node";

export const cmds: Required<
  ICliCommand<IGlobalArgs, Record<never, never>>
>["subcommands"] = [node, standalone];
