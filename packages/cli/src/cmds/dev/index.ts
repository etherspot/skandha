import { ICliCommand, ICliCommandOptions } from "../../util";
import { IGlobalArgs } from "../../options";
import { bundlerOptions, IBundlerArgs } from "./options";
import { bundlerHandler } from "./handler";

export const start: ICliCommand<IBundlerArgs, IGlobalArgs> = {
  command: "start",
  describe: "Run a bundler client",
  examples: [
    {
      command: "start --network goerli",
      description: "Run a bundler client and connect to the goerli testnet",
    },
  ],
  options: bundlerOptions as ICliCommandOptions<IBundlerArgs>,
  handler: bundlerHandler,
};
