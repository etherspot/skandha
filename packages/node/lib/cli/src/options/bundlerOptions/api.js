"use strict";
// import {ICliCommandOptions} from "../../util";
// const enabledAll = "*";
// export interface IApiArgs {
//     "rest.namespace": string[];
//     "rest.cors": string;
//     rest: boolean;
//     "rest.address": string;
//     "rest.port": number;
// }
// export function parseArgs(args: IApiArgs): IBundlerNodeOptions["api"] {
//     return {
//       rest: {
//         api: args["rest.namespace"] as IBundlerNodeOptions["api"]["rest"]["api"],
//         cors: args["rest.cors"],
//         enabled: args["rest"],
//         address: args["rest.address"],
//         port: args["rest.port"],
//       },
//     };
//   }
//   export const options: ICliCommandOptions<IApiArgs> = {
//     rest: {
//         type: "boolean",
//         description: "Enable/disable HTTP API",
//         defaultDescription: String(defaultOptions.api.rest.enabled),
//         group: "api",
//     },
//     "rest.namespace": {
//         type: "array",
//         choices: [...allNamespaces, enabledAll],
//         description: `Pick namespaces to expose for HTTP API. Set to '${enabledAll}' to enable all namespaces`,
//         defaultDescription: JSON.stringify(defaultOptions.api.rest.api),
//         group: "api",
//         coerce: (namespaces: string[]): string[] => {
//           // Enable all
//           if (namespaces.includes(enabledAll)) return allNamespaces;
//           // Parse ["debug,lodestar"] to ["debug", "lodestar"]
//           return namespaces.map((val) => val.split(",")).flat(1);
//         },
//     },
//     "rest.cors": {
//       type: "string",
//       description: "Configures the Access-Control-Allow-Origin CORS header for HTTP API",
//       defaultDescription: defaultOptions.api.rest.cors,
//       group: "api",
//     },
//     "rest.address": {
//       type: "string",
//       description: "Set host for HTTP API",
//       defaultDescription: defaultOptions.api.rest.address,
//       group: "api",
//     },
//     "rest.port": {
//       type: "number",
//       description: "Set port for HTTP API",
//       defaultDescription: String(defaultOptions.api.rest.port),
//       group: "api",
//     },
//   };
//# sourceMappingURL=api.js.map