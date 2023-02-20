export * from "./options";
export var BundlerNodeStatus;
(function (BundlerNodeStatus) {
    BundlerNodeStatus["started"] = "started";
    BundlerNodeStatus["closing"] = "closing";
    BundlerNodeStatus["closed"] = "closed";
    BundlerNodeStatus["running"] = "running";
})(BundlerNodeStatus || (BundlerNodeStatus = {}));
export class BundlerNode {
    opts;
    status;
    constructor({ opts }) {
        this.opts = opts;
        this.status = BundlerNodeStatus.started;
    }
    static async init({ opts, }) {
        // TODO - start all the sub modules
        // 1 - db service
        // 2 - Gossipsub service
        return new this({
            opts,
        });
    }
    /**
     * Stop beacon node and its sub-components.
     */
    async close() {
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
//# sourceMappingURL=index.js.map