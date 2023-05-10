import { PeerId } from "@libp2p/interface-peer-id";
import { Server } from "api/lib/server";
import { ApiApp } from "api/lib/app";
import { Config } from "executor/lib/config";
import { IDbController } from "types/lib";
import { SignableENR } from "@chainsafe/discv5";
import { INodeAPI } from "types/lib/node";
import { Network } from "./network/network";
import { IBundlerNodeOptions } from "./options";
import { getApi } from "./api";

export * from "./options";

export enum BundlerNodeStatus {
  started = "started",
  closing = "closing",
  closed = "closed",
  running = "running",
}

export interface BundlerNodeOptions {
  network: Network;
  server: Server;
  bundler: ApiApp;
  nodeApi: INodeAPI;
}

export interface BundlerNodeInitOptions {
  nodeOptions: IBundlerNodeOptions;
  relayersConfig: Config;
  relayerDb: IDbController;
  peerId?: PeerId;
  testingMode: boolean;
}

export class BundlerNode {
  server: Server;
  bundler: ApiApp;
  status: BundlerNodeStatus;
  private controller?: AbortController;
  network: Network;

  constructor(opts: BundlerNodeOptions) {
    this.status = BundlerNodeStatus.started;
    this.network = opts.network;
    this.server = opts.server;
    this.bundler = opts.bundler;
  }

  static async init(opts: BundlerNodeInitOptions): Promise<BundlerNode> {
    const { nodeOptions, relayerDb, relayersConfig, testingMode } = opts;
    let { peerId } = opts;

    if (!peerId) {
      const enr = nodeOptions.network.discv5?.enr as SignableENR;
      peerId = await enr.peerId();
    }

    const network = await Network.init({
      opts: nodeOptions.network,
      peerId: peerId,
      peerStoreDir: nodeOptions.network.dataDir,
    });

    const nodeApi = getApi({ network });

    const server = new Server({
      enableRequestLogging: nodeOptions.api.enableRequestLogging,
      port: nodeOptions.api.port,
      host: nodeOptions.api.address,
    });

    await relayerDb.start();

    const bundler = new ApiApp({
      server: server.application,
      config: relayersConfig,
      db: relayerDb,
      testingMode,
      nodeApi,
    });

    return new BundlerNode({
      network,
      server,
      bundler,
      nodeApi,
    });
  }

  async start(): Promise<void> {
    await this.network.start();
    this.server.listen();
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
