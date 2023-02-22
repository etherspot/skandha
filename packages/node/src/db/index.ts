import { DbController } from "db/lib";
import { IDBOptions } from "../options";

export interface IBundlerDb {
  start(): Promise<void>;
  stop(): Promise<void>;
}

export class BundlerDb extends DbController implements IBundlerDb {
  constructor(opts: IDBOptions) {
    if (opts.namespace === "") opts.namespace = "userops";

    super(opts.dbFile, opts.namespace);
  }

  async start(): Promise<void> {
    await super.start();
  }

  async stop(): Promise<void> {
    await super.stop();
  }
}
