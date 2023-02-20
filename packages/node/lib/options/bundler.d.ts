import { IApiOptions } from "./api";
import { IDBOptions } from "./db";
import { INetworkOptions } from "./network";
export interface IBundlerNodeOptions {
    api: IApiOptions;
    db: IDBOptions;
    p2p: INetworkOptions;
}
export declare const defaultOptions: IBundlerNodeOptions;
//# sourceMappingURL=bundler.d.ts.map