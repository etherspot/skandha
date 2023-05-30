import { ICliCommand, ICliCommandOptions } from "../../util";
import { IGlobalArgs } from "../../options";
import { nodeHandler } from "./handler";
import { INodeArgs, nodeOptions } from "./options";

export const node: ICliCommand<INodeArgs, IGlobalArgs> = {
  command: "node",
  describe: "Quickly bootstrap a bundler node with p2p interface.",
  examples: [
    {
      command: "node --sepolia",
      description: "Start a skandha bundler node on sepolia network",
    },
  ],
  options: nodeOptions as ICliCommandOptions<INodeArgs>,
  handler: nodeHandler,
};
