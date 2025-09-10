import { ICliCommand, ICliCommandOptions } from "../../util/index.js";
import { IStandaloneGlobalArgs, standaloneGlobalOptions } from "../../options/index.js";
import { bundlerHandler } from "./handler.js";

export const standalone: ICliCommand<IStandaloneGlobalArgs> = {
  command: "standalone",
  describe: "Run a standalone bundler client",
  examples: [
    {
      command: "standalone",
      description:
        "Run a bundler client (without p2p) and connect to the goerli testnet",
    },
  ],
  options: standaloneGlobalOptions as ICliCommandOptions<IStandaloneGlobalArgs>,
  handler: bundlerHandler,
};
