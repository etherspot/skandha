import {Options} from "yargs";
import {bundlerNodeOptions, IBundlerNodeArgs} from "../../options";
import {logOptions} from "../../options/logOptions";
import {ICliCommandOptions, ILogArgs} from "../../util/index";
import {defaultBundlerPaths, IBundlerPaths} from "./paths";

interface IBundlerExtraArgs {
  configFile?: string;
  bootnodesFile?: string;
  dbDir?: string;
  persistInvalidSszObjectsDir?: string;
  peerStoreDir?: string;
}

export const bundlerExtraOptions: ICliCommandOptions<IBundlerExtraArgs> = {
  configFile: {
    hidden: true,
    description: "Bundler node configuration file path",
    type: "string",
  },

  bootnodesFile: {
    hidden: true,
    description: "Bootnodes file path",
    type: "string",
  },

  dbDir: {
    description: "Bundler's DB directory",
    defaultDescription: defaultBundlerPaths.dbDir,
    hidden: true,
    type: "string",
  },

  persistInvalidSszObjectsDir: {
    description:
      "Enable and specify a directory to persist invalid ssz objects",
    defaultDescription: defaultBundlerPaths.persistInvalidSszObjectsDir,
    hidden: true,
    type: "string",
  },

  peerStoreDir: {
    hidden: true,
    description: "Peer store directory",
    defaultDescription: defaultBundlerPaths.peerStoreDir,
    type: "string",
  },
};

interface IENRArgs {
  "enr.ip"?: string;
  "enr.tcp"?: number;
  "enr.ip6"?: string;
  "enr.udp"?: number;
  "enr.tcp6"?: number;
  "enr.udp6"?: number;
}

const enrOptions: Record<string, Options> = {
  "enr.ip": {
    description: "Override ENR IP entry",
    type: "string",
    group: "enr",
  },
  "enr.tcp": {
    description: "Override ENR TCP entry",
    type: "number",
    group: "enr",
  },
  "enr.udp": {
    description: "Override ENR UDP entry",
    type: "number",
    group: "enr",
  },
  "enr.ip6": {
    description: "Override ENR IPv6 entry",
    type: "string",
    group: "enr",
  },
  "enr.tcp6": {
    description: "Override ENR (IPv6-specific) TCP entry",
    type: "number",
    group: "enr",
  },
  "enr.udp6": {
    description: "Override ENR (IPv6-specific) UDP entry",
    type: "number",
    group: "enr",
  },
};

export type DebugArgs = { attachToGlobalThis: boolean };
export const debugOptions: ICliCommandOptions<DebugArgs> = {
  attachToGlobalThis: {
    hidden: true,
    description:
      "Attach the bundler node to `globalThis`. Useful to inspect a running bundler node.",
    type: "boolean",
  },
};

export type IBundlerArgs = IBundlerExtraArgs &
  ILogArgs &
  IBundlerPaths &
  IBundlerNodeArgs &
  IENRArgs &
  DebugArgs;

export const bundlerOptions: { [k: string]: Options } = {
  ...bundlerExtraOptions,
  ...logOptions,
  ...bundlerNodeOptions,
  ...enrOptions,
  ...debugOptions,
};
