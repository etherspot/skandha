import { NetworkName, networkNames } from "types/lib";
import { ICliCommand, ICliCommandOptions } from "../../util";
import { IGlobalArgs } from "../../options";
import { bundlerHandler } from "./handler";

export interface IBundlerArgs {
  networks: NetworkName;
}

export const bundlerOptions = {
  networks: {
    description: "Name of the EVM chain to join",
    type: "string[]",
    defaultDescription: "goerli",
    choices: networkNames,
  },
};

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
