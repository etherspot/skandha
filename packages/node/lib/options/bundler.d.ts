import { IApiOptions } from "../../src/options/api";
import { IDBOptions } from "../../src/options/db";
import { INetworkOptions } from "../../src/options/network";
export interface IBundlerNodeOptions {
    api: IApiOptions;
    db: IDBOptions;
    p2p: INetworkOptions;
}
export declare const defaultOptions: IBundlerNodeOptions;
//# sourceMappingURL=bundler.d.ts.map