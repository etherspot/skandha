import { defaultApiOptions } from "types/lib/options/api";
import { ICliCommandOptions } from "../../util";
import { IBundlerOptions } from "./options";

export interface IApiArgs {
  "api.cors": string;
  "api.address": string;
  "api.port": number;
  "api.enableRequestLogging": boolean;
  "api.websocket": boolean;
}

export function parseArgs(args: IApiArgs): IBundlerOptions["api"] {
  return {
    address: args["api.address"],
    port: args["api.port"],
    cors: args["api.cors"],
    enableRequestLogging: args["api.enableRequestLogging"],
    websocket: args["api.websocket"],
  };
}

export const options: ICliCommandOptions<IApiArgs> = {
  "api.cors": {
    type: "string",
    description:
      "Configures the Access-Control-Allow-Origin CORS header for HTTP API",
    default: defaultApiOptions.cors,
    group: "api",
    demandOption: false,
  },

  "api.address": {
    type: "string",
    description: "Set host for HTTP API",
    default: defaultApiOptions.address,
    group: "api",
    demandOption: false,
  },

  "api.port": {
    type: "number",
    description: "Set port for HTTP API",
    default: defaultApiOptions.port,
    group: "api",
    demandOption: false,
  },

  "api.enableRequestLogging": {
    type: "boolean",
    description: "Enable request logging",
    default: defaultApiOptions.enableRequestLogging,
    group: "api",
    demandOption: false,
  },

  "api.websocket": {
    type: "boolean",
    description: "Enable websocket interface",
    default: defaultApiOptions.websocket,
    group: "api",
    demandOption: false,
  },
};
