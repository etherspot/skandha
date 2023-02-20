import { networkNames } from "types/lib";
import { ICliCommandOptions, readFile } from "../util";

interface IGlobalSingleArgs {
  dataDir?: string;
  network?: string;
  networksFile: string;
}

export const defaultNetwork = "mainnet";

const globalSingleOptions: ICliCommandOptions<IGlobalSingleArgs> = {
  dataDir: {
    description: "Bundler root data directory",
    type: "string",
  },

  network: {
    description: "Name of the EVM chain to join",
    type: "string",
    defaultDescription: defaultNetwork,
    choices: networkNames,
  },

  networksFile: {
    description: "Network configuration file",
    type: "string",
  },
};

export const rcConfigOption: [
  string,
  string,
  (configPath: string) => Record<string, unknown>
] = [
  "rcConfig",
  "RC file to supplement command line args, accepted formats: .yml, .yaml, .json",
  (configPath: string): Record<string, unknown> =>
    readFile(configPath, ["json", "yml", "yaml"]),
];

export type IGlobalArgs = IGlobalSingleArgs;

export const globalOptions = {
  ...globalSingleOptions,
};
