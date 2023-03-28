// import { NetworkName, networkNames } from "types/lib";
// import { ExecutorOptions } from "types/lib/options/executor";
// import { addPrefix } from "types/lib/types";
// import { ICliCommandOptions } from "../../util";
// import { IBundlerOptions } from "./options";

// export type ExecutorNetworkName = addPrefix<NetworkName, "executor.">; // `executor.${NetworkName}`;

// export type IExecutorArgs = {
//   [network in ExecutorNetworkName]?: {
//     entryPoints: string[];
//     relayer: string;
//     beneficiary: string;
//     rpcEndpoint: string;
//     minInclusionDenominator?: number;
//     throttlingSlack?: number;
//     banSlack?: number;
//     minSignerBalance?: string;
//     multicall?: string;
//   };
// };

// export function parseArgs(args: IExecutorArgs): IBundlerOptions["executor"] {
//   const executorOptions: ExecutorOptions = {};
//   for (const network of Object.keys(args)) {
//     const key = network.slice(9) as NetworkName;
//     if (networkNames.findIndex((net) => net === network) == -1) {
//       continue;
//     }
//     executorOptions[key] = args[network as keyof IExecutorArgs];
//   }
//   return executorOptions;
// }

// export const options: ICliCommandOptions<IExecutorArgs> = {
//   "executor.mainnet": {
//     type: undefined,
//     description: "Mainnet configuration",
//     default: {},
//     group: "executor",
//     demandOption: false,
//   },
//   "executor.dev": {},
//   "executor.arbitrumNitro": {},
//   "executor.gnosis": {},
//   "executor.goerli": {},
//   "executor.mumbai": {},
//   "executor.etherspot": {},
//   "executor.base": {},
// };
