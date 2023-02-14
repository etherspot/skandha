import { Options } from "yargs";
import { IBundlerNodeArgs } from "../../options";
import { ICliCommandOptions, ILogArgs } from "../../util/index";
import { IBundlerPaths } from "./paths";
interface IBundlerExtraArgs {
    configFile?: string;
    bootnodesFile?: string;
    dbDir?: string;
    persistInvalidSszObjectsDir?: string;
    peerStoreDir?: string;
}
export declare const bundlerExtraOptions: ICliCommandOptions<IBundlerExtraArgs>;
interface IENRArgs {
    "enr.ip"?: string;
    "enr.tcp"?: number;
    "enr.ip6"?: string;
    "enr.udp"?: number;
    "enr.tcp6"?: number;
    "enr.udp6"?: number;
}
export declare type DebugArgs = {
    attachToGlobalThis: boolean;
};
export declare const debugOptions: ICliCommandOptions<DebugArgs>;
export declare type IBundlerArgs = IBundlerExtraArgs & ILogArgs & IBundlerPaths & IBundlerNodeArgs & IENRArgs & DebugArgs;
export declare const bundlerOptions: {
    [k: string]: Options;
};
export {};
//# sourceMappingURL=options.d.ts.map