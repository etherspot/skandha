import { ICliCommand, ICliCommandOptions } from "../../util";
import { IStandaloneGlobalArgs, standaloneGlobalOptions } from "../../options";
import { bundlerHandler } from "./handler";

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
