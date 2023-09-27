import { defaultP2POptions } from "types/lib/options";
import { ICliCommandOptions } from "../../util";
import { IBundlerOptions } from "./options";

export interface INetworkArgs {
  "p2p.host": string;
  "p2p.port": number;
  "p2p.enrHost": string;
  "p2p.enrPort": number;
  "p2p.bootEnrs": string[];
  "p2p.retainPeerId": boolean;
}

export function parseArgs(args: INetworkArgs): IBundlerOptions["p2p"] {
  return {
    host: args["p2p.host"],
    port: args["p2p.port"],
    enrHost: args["p2p.enrHost"],
    enrPort: args["p2p.enrPort"],
    bootEnrs: args["p2p.bootEnrs"],
    retainPeerId: args["p2p.retainPeerId"],
  };
}

export const options: ICliCommandOptions<INetworkArgs> = {
  "p2p.host": {
    type: "string",
    description: "P2P host",
    default: defaultP2POptions.host,
    group: "p2p",
    demandOption: false,
  },
  "p2p.port": {
    type: "number",
    description: "P2P port",
    default: defaultP2POptions.port,
    group: "p2p",
    demandOption: false,
  },
  "p2p.enrHost": {
    type: "string",
    description: "P2P ENR IP",
    default: defaultP2POptions.enrHost,
    group: "p2p",
    demandOption: false,
  },
  "p2p.enrPort": {
    type: "string",
    description: "P2P ENR port",
    default: defaultP2POptions.enrPort,
    group: "p2p",
    demandOption: false,
  },
  "p2p.bootEnrs": {
    type: "array",
    description: "P2P boot ENRS",
    default: defaultP2POptions.bootEnrs,
    group: "p2p",
    demandOption: false,
  },
  "p2p.retainPeerId": {
    type: "boolean",
    description: "P2P persist network identity",
    default: defaultP2POptions.retainPeerId,
    group: "p2p",
    demandOption: false,
  },
};
