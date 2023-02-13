
import {ICliCommandOptions, readFile} from "../util";

interface IGlobalSingleArgs {
  dataDir?: string;
  network?: string;
  paramsFile: string;
}

export const defaultNetwork: string = "mainnet";
export type NetworkName = "mainnet" | "dev" | "gnosis" | "goerli" | "mumbai" | "arbitrumNitro";
export const networkNames: NetworkName[] = [
  "mainnet",
  "gnosis",
  "goerli",
  "mumbai",
  "arbitrumNitro",
  // Leave always as last network. The order matters for the --help printout
  "dev",
];

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

  paramsFile: {
    description: "Network configuration file",
    type: "string",
  },
};

export const rcConfigOption: [string, string, (configPath: string) => Record<string, unknown>] = [
  "rcConfig",
  "RC file to supplement command line args, accepted formats: .yml, .yaml, .json",
  (configPath: string): Record<string, unknown> => readFile(configPath, ["json", "yml", "yaml"]),
];

export type IGlobalArgs = IGlobalSingleArgs;

export const globalOptions = {
  ...globalSingleOptions,
};