import { ICliCommandOptions } from "../util";
import { IApiArgs, options as apiOptions } from "./bundlerOptions/api";

interface IGlobalSingleArgs {
  dataDir: string;
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

  networksFile: {
    description: "Network configuration file",
    type: "string",
    default: defaultNetworksFile,
    demandOption: false,
  },
};

export type IGlobalArgs = IGlobalSingleArgs & IApiArgs;

export const globalOptions = {
  ...globalSingleOptions,
  ...apiOptions,
};
