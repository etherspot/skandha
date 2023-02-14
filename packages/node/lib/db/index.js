import { DbController } from 'db/lib';
;
export class BundlerDb extends DbController {
    constructor(opts) {
        if (opts.namespace === "")
            opts.namespace = "userops";
        super(opts.dbDir, opts.dbFile, opts.namespace);
    }
    async start() {
        await super.start();
    }
    async stop() {
        await super.stop();
    }
}
;
//# sourceMappingURL=index.js.map