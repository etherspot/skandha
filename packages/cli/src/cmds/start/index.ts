import { ICliCommand, ICliCommandOptions } from "../../util";
import { IGlobalArgs } from "../../options";
import { bundlerHandler } from "./handler";

export interface IBundlerArgs {
  testingMode: boolean;
}

export const bundlerOptions = {
  testingMode: {
    description: "Run bundler in dev mode (For testing against test suite)",
    type: "boolean",
    default: false,
    choices: [true, false],
  },
};

export const start: ICliCommand<IBundlerArgs, IGlobalArgs> = {
  command: "start",
  describe: "Run a bundler client",
  examples: [
    {
      command: "start",
      description: "Run a bundler client and connect to the goerli testnet",
    },
  ],
  options: bundlerOptions as ICliCommandOptions<IBundlerArgs>,
  handler: bundlerHandler,
};
