import { PeerId } from "@libp2p/interface-peer-id";
import { Server } from "api/lib/server";
import { ApiApp } from "api/lib/app";
import { Config } from "executor/lib/config";
import { IDbController } from "types/lib";
import { SignableENR } from "@chainsafe/discv5";
import { INodeAPI } from "types/lib/node";
import { Executor } from "executor/lib/executor";
import logger from "api/lib/logger";
import { Executors } from "executor/lib/interfaces";
import { BundlingMode } from "types/lib/api/interfaces";
import { Network } from "./network/network";
import { SyncService } from "./sync";
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
  executors: Executors;
  syncService: SyncService;
}

export interface BundlerNodeInitOptions {
  nodeOptions: IBundlerNodeOptions;
  relayersConfig: Config;
  relayerDb: IDbController;
  peerId?: PeerId;
  testingMode: boolean;
  redirectRpc: boolean;
  bundlingMode: BundlingMode;
}

export class BundlerNode {
  server: Server;
  bundler: ApiApp;
  status: BundlerNodeStatus;
  network: Network;
  syncService: SyncService;

  constructor(opts: BundlerNodeOptions) {
    this.status = BundlerNodeStatus.started;
    this.network = opts.network;
    this.server = opts.server;
    this.bundler = opts.bundler;
    this.syncService = opts.syncService;
  }

  static async init(opts: BundlerNodeInitOptions): Promise<BundlerNode> {
    const {
      nodeOptions,
      relayerDb,
      relayersConfig,
      testingMode,
      redirectRpc,
      bundlingMode,
    } = opts;
    let { peerId } = opts;

    if (!peerId) {
      const enr = nodeOptions.network.discv5?.enr as SignableENR;
      peerId = await enr.peerId();
    }

    const executors: Executors = new Map<number, Executor>();

    const network = await Network.init({
      opts: nodeOptions.network,
      relayersConfig: relayersConfig,
      peerId: peerId,
      peerStoreDir: nodeOptions.network.dataDir,
      executors, // ok: is empty at the moment
    });

    const syncService = new SyncService({ network });

    const nodeApi = getApi({ network });

    await relayerDb.start();

    const server = await Server.init({
      enableRequestLogging: nodeOptions.api.enableRequestLogging,
      port: nodeOptions.api.port,
      host: nodeOptions.api.address,
      cors: nodeOptions.api.cors,
    });

    if (relayersConfig.testingMode) {
      const executor = new Executor({
        network: "dev",
        chainId: 1337,
        db: relayerDb,
        config: relayersConfig,
        logger: logger,
        nodeApi,
        bundlingMode,
      });
      executors.set(1337, executor);
    } else {
      for (const [networkName, chainId] of Object.entries(
        relayersConfig.supportedNetworks
      )) {
        const executor = new Executor({
          network: networkName,
          chainId,
          db: relayerDb,
          config: relayersConfig,
          logger: logger,
          nodeApi,
          bundlingMode,
        });
        executors.set(chainId, executor);
      }
    }

    const bundler = new ApiApp({
      server: server.application,
      config: relayersConfig,
      db: relayerDb,
      testingMode,
      redirectRpc,
      executors,
    });

    return new BundlerNode({
      network,
      server,
      bundler,
      nodeApi,
      executors,
      syncService,
    });
  }

  async start(): Promise<void> {
    await this.network.start();
    await this.server.listen();
  }

  /**
   * Stop beacon node and its sub-components.
   */
  async close(): Promise<void> {
    if (this.status === BundlerNodeStatus.started) {
      this.status = BundlerNodeStatus.closing;

      this.syncService.close();
      await this.network.stop();

      this.status = BundlerNodeStatus.closed;
    }
  }
}
