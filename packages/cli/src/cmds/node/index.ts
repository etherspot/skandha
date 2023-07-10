import { ICliCommand, ICliCommandOptions } from "../../util";
import { IGlobalArgs, globalOptions } from "../../options";
import { nodeHandler } from "./handler";

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
