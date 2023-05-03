import { defaultNetworkOptions } from "types/lib/options/network";
import { ICliCommandOptions } from "../../util";
import { IBundlerOptions } from "./options";

export interface INetworkArgs {
  "p2p.host": string;
  "p2p.port": number;
  "p2p.bootEnrs": string[];
}

export function parseArgs(args: INetworkArgs): IBundlerOptions["p2p"] {
  return {
    host: args["p2p.host"],
    port: args["p2p.port"],
    bootEnrs: args["p2p.bootEnrs"],
  };
}

export const options: ICliCommandOptions<INetworkArgs> = {
  "p2p.host": {
    type: "string",
    description: "P2P host",
    default: defaultNetworkOptions.host,
    group: "p2p",
    demandOption: false,
  },
  "p2p.port": {
    type: "number",
    description: "P2P port",
    default: defaultNetworkOptions.port,
    group: "p2p",
    demandOption: false,
  },
  "p2p.bootEnrs": {
    type: "array",
    description: "P2P boot ENRS",
    default: defaultNetworkOptions.bootEnrs,
    group: "p2p",
    demandOption: false,
  },
};
