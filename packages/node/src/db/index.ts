import { DbController } from 'db/lib';
import { IDBOptions } from "../options";

export interface IBundlerDb {
    start(): Promise<void>;
    stop(): Promise<void>;
};

export class BundlerDb extends DbController implements IBundlerDb {
    constructor(opts: IDBOptions) {
        
        if(opts.namespace === "") opts.namespace = "userops";
        
        super(opts.dbDir,opts.dbFile,opts.namespace);
    }

    async start() {
        await super.start();
    }

    async stop() {
        await super.stop();
    }
};
