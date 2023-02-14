import { DbController } from 'db/lib';
import { IDBOptions } from "../options";
export interface IBundlerDb {
    start(): Promise<void>;
    stop(): Promise<void>;
}
export declare class BundlerDb extends DbController implements IBundlerDb {
    constructor(opts: IDBOptions);
    start(): Promise<void>;
    stop(): Promise<void>;
}
//# sourceMappingURL=index.d.ts.map