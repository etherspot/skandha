import { ICliCommand } from "../util/index.js";
import { IGlobalArgs } from "../options/index.js";
import { standalone } from "./standalone/index.js";
import { node } from "./node/index.js";

export const cmds: Required<
  ICliCommand<IGlobalArgs, Record<never, never>>
>["subcommands"] = [node, standalone];
