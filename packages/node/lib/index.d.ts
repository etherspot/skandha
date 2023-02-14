import { IBundlerNodeOptions } from "../src/options";
export * from "../src/options";
export declare enum BundlerNodeStatus {
    started = "started",
    closing = "closing",
    closed = "closed",
    running = "running"
}
export interface IBundlerNodeInitModules {
    opts: IBundlerNodeOptions;
}
export declare class BundlerNode {
    opts: IBundlerNodeOptions;
    status: BundlerNodeStatus;
    constructor({ opts }: IBundlerNodeInitModules);
    static init<T extends BundlerNode = BundlerNode>({ opts, }: IBundlerNodeInitModules): Promise<T>;
    /**
     * Stop beacon node and its sub-components.
     */
    close(): Promise<void>;
}
//# sourceMappingURL=index.d.ts.map