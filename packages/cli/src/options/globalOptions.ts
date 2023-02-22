import { networkNames } from "types/lib";
import { ICliCommandOptions } from "../util";
import { api } from "./bundlerOptions";

interface IGlobalSingleArgs {
  dataDir: string;
  network: string;
  networksFile: string;
}

export const defaultNetwork = "goerli";
export const defaultNetworksFile = "config.json";

const globalSingleOptions: ICliCommandOptions<IGlobalSingleArgs> = {
  dataDir: {
    description: "Bundler root data directory",
    type: "string",
    default: process.cwd(),
    demandOption: false,
  },

  network: {
    description: "Name of the EVM chain to join",
    type: "string",
    choices: networkNames,
    default: defaultNetwork,
    demandOption: false,
  },

  networksFile: {
    description: "Network configuration file",
    type: "string",
    default: defaultNetworksFile,
    demandOption: false,
  },
};

export type IGlobalArgs = IGlobalSingleArgs;

export const globalOptions = {
  ...globalSingleOptions,
  ...api.options,
};
