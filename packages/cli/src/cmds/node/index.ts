import { ICliCommand, ICliCommandOptions } from "../../util/index.js";
import { IGlobalArgs, globalOptions } from "../../options/index.js";
import { nodeHandler } from "./handler.js";

export const node: ICliCommand<IGlobalArgs, IGlobalArgs> = {
  command: "node",
  describe: "Quickly bootstrap a bundler node with p2p interface.",
  examples: [
    {
      command: "node --sepolia",
      description: "Start a skandha bundler node on sepolia network",
    },
  ],
  options: globalOptions as ICliCommandOptions<IGlobalArgs>,
  handler: nodeHandler,
};
