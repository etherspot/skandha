import { PeerId } from "@libp2p/interface-peer-id";
import { Network } from "./network/network";
import { IBundlerNodeOptions } from "./options";

export * from "./options";

export enum BundlerNodeStatus {
  started = "started",
  closing = "closing",
  closed = "closed",
  running = "running",
}

export interface BundlerNodeOptions {
  network: Network;
}

export interface BundlerNodeInitOptions {
  opts: IBundlerNodeOptions;
  peerId: PeerId;
}

export class BundlerNode {
  status: BundlerNodeStatus;
  private controller?: AbortController;
  network: Network;

  constructor(opts: BundlerNodeOptions) {
    this.status = BundlerNodeStatus.started;
    this.network = opts.network;
  }

  static async init({
    opts,
    peerId,
  }: BundlerNodeInitOptions): Promise<BundlerNode> {
    const network = await Network.init({
      opts: opts.network,
      peerId: peerId,
    });

    return new BundlerNode({
      network,
    });
  }

  /**
   * Stop beacon node and its sub-components.
   */
  async close(): Promise<void> {
    if (this.status === BundlerNodeStatus.started) {
      this.status = BundlerNodeStatus.closing;
      // close
      this.status = BundlerNodeStatus.closed;
    }
  }
}
