import { ICliCommand, ICliCommandOptions } from "../../util";
import { IGlobalArgs } from "../../options";
import { bundlerHandler } from "./handler";

export interface IBundlerArgs {
  testingMode: boolean;
  unsafeMode: boolean;
  redirectRpc: boolean;
}

export const bundlerOptions = {
  testingMode: {
    description: "Run bundler in testing mode (For testing against test suite)",
    type: "boolean",
    default: false,
    choices: [true, false],
  },
  unsafeMode: {
    description: "Run bundler in unsafe mode (Bypass opcode & stake check)",
    type: "boolean",
    default: false,
    choices: [true, false],
  },
  redirectRpc: {
    description:
      "Redirect ETH-related rpc calls to the underlying execution client",
    type: "boolean",
    default: false,
    choices: [true, false],
  },
};

export const standalone: ICliCommand<IBundlerArgs, IGlobalArgs> = {
  command: "standalone",
  describe: "Run a standalone bundler client",
  examples: [
    {
      command: "standalone",
      description:
        "Run a bundler client (without p2p) and connect to the goerli testnet",
    },
  ],
  options: bundlerOptions as ICliCommandOptions<IBundlerArgs>,
  handler: bundlerHandler,
};
