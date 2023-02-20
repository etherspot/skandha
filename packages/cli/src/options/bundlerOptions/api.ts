// eslint-disable-next-line import/no-extraneous-dependencies
import { IBundlerNodeOptions, defaultOptions } from "node/lib/options/bundler";
import { ICliCommandOptions } from "../../util";

export interface IApiArgs {
  cors: string;
  address: string;
  port: number;
}

export function parseArgs(args: IApiArgs): IBundlerNodeOptions["api"] {
  return {
    address: args["address"],
    port: args["port"],
    cors: args["cors"],
  };
}

export const options: ICliCommandOptions<IApiArgs> = {
  cors: {
    type: "string",
    description:
      "Configures the Access-Control-Allow-Origin CORS header for HTTP API",
    defaultDescription: defaultOptions.api.cors,
    group: "api",
  },

  address: {
    type: "string",
    description: "Set host for HTTP API",
    defaultDescription: defaultOptions.api.address,
    group: "api",
  },

  port: {
    type: "number",
    description: "Set port for HTTP API",
    defaultDescription: String(defaultOptions.api.port),
    group: "api",
  },
};
