import { NetworkName, networkNames } from "types/lib";
import { ICliCommand, ICliCommandOptions } from "../../util";
import { IGlobalArgs } from "../../options";
import { bundlerHandler } from "./handler";

export interface IBundlerArgs {
  networks: NetworkName;
  testingMode: boolean;
}

export const bundlerOptions = {
  networks: {
    description: "Name of the EVM chain to join",
    type: "string[]",
    default: "goerli",
    choices: networkNames,
  },
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
