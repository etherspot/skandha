import { homedir } from "node:os";
import { ICliCommandOptions } from "../util";
import { IApiArgs, options as apiOptions } from "./bundlerOptions/api";
import {
  INetworkArgs,
  options as networkOptions,
} from "./bundlerOptions/network";
import {
  IExecutorArgs,
  options as executorOptions,
} from "./bundlerOptions/executor";
import {
  IMetricsArgs,
  options as metricsOptions,
} from "./bundlerOptions/metrics";

const __dirname = process.cwd();

interface IGlobalSingleArgs {
  dataDir: string;
  configFile: string;
  testingMode: boolean;
  unsafeMode: boolean;
  redirectRpc: boolean;
}

export const defaultNetwork = "goerli";
export const defaultNetworksFile = "config.json";

const globalSingleOptions: ICliCommandOptions<IGlobalSingleArgs> = {
  configFile: {
    description: "Location of the configuration file used by Skandha",
    type: "string",
    default: `${__dirname}/config.json`,
  },
  dataDir: {
    description: "Location of the data directory used by Skandha",
    type: "string",
    default: `${homedir()}/.skandha/db/`,
  },
  testingMode: {
    description: "Run bundler in testing mode (For testing against test suite)",
    type: "boolean",
    default: false,
  },
  unsafeMode: {
    description: "Run bundler in unsafe mode (Bypass opcode & stake check)",
    type: "boolean",
    default: false,
  },
  redirectRpc: {
    description: "Redirect RPC calls to underlying ETH1 client",
    type: "boolean",
    default: false,
  },
};

export type IGlobalArgs = IGlobalSingleArgs &
  IApiArgs &
  INetworkArgs &
  IExecutorArgs;

export const globalOptions = {
  ...globalSingleOptions,
  ...apiOptions,
  ...networkOptions,
  ...executorOptions,
  ...metricsOptions,
};

export type IStandaloneGlobalArgs = IGlobalSingleArgs &
  IApiArgs &
  IExecutorArgs &
  IMetricsArgs;

export const standaloneGlobalOptions = {
  ...globalSingleOptions,
  ...apiOptions,
  ...executorOptions,
  ...metricsOptions,
};
