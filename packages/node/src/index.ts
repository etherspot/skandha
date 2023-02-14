import { IBundlerNodeOptions } from "./options";

export * from "./options";

export enum BundlerNodeStatus {
  started = "started",
  closing = "closing",
  closed = "closed",
  running = "running",
}

export interface IBundlerNodeInitModules {
  opts: IBundlerNodeOptions;
}

export class BundlerNode {
  opts: IBundlerNodeOptions;
  status: BundlerNodeStatus;

  constructor({opts}: IBundlerNodeInitModules) {
    this.opts = opts;
    this.status = BundlerNodeStatus.started;
  }

  static async init<T extends BundlerNode = BundlerNode>({
    opts,
  }: IBundlerNodeInitModules): Promise<T> {
    // TODO - start all the sub modules
    // 1 - db service
    // 2 - Gossipsub service

    return new this({
      opts,
    }) as T;
  }

  /**
   * Stop beacon node and its sub-components.
   */
  async close(): Promise<void> {
    if (this.status === BundlerNodeStatus.started) {
      this.status = BundlerNodeStatus.closing;
      //   this.sync.close();
      //   this.backfillSync?.close();
      //   await this.network.stop();
      //   if (this.metricsServer) await this.metricsServer.stop();
      //   if (this.restApi) await this.restApi.close();

      //   await this.chain.persistToDisk();
      //   await this.chain.close();
      //   await this.db.stop();
      //   if (this.controller) this.controller.abort();
      this.status = BundlerNodeStatus.closed;
    }
  }
}
