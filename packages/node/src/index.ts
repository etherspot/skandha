import { PeerId } from "@libp2p/interface-peer-id";
import { Server } from "@skandha/api/lib/server";
import { ApiApp } from "@skandha/api/lib/app";
import { Config } from "@skandha/executor/lib/config";
import { IDbController } from "@skandha/types/lib";
import { SignableENR } from "@chainsafe/discv5";
import { INodeAPI } from "@skandha/types/lib/node";
import { Executor } from "@skandha/executor/lib/executor";
import logger from "@skandha/api/lib/logger";
import { BundlingMode } from "@skandha/types/lib/api/interfaces";
import { createMetrics, getHttpMetricsServer } from "@skandha/monitoring/lib";
import { MetricsOptions } from "@skandha/types/lib/options/metrics";
import { GetNodeAPI } from "@skandha/executor/lib/interfaces";
import { SkandhaVersion } from "@skandha/types/lib/executor";
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
  executor: Executor;
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
  metricsOptions: MetricsOptions;
  version: SkandhaVersion;
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
      metricsOptions,
      version,
    } = opts;
    let { peerId } = opts;

    if (!peerId) {
      const enr = nodeOptions.network.discv5?.enr as SignableENR;
      peerId = await enr.peerId();
    }

    let executor: Executor;
    let nodeApi: INodeAPI | null = null;

    const metrics = metricsOptions.enable
      ? createMetrics({ p2p: true }, logger)
      : null;

    const getNodeApi: GetNodeAPI = () => nodeApi;
    if (relayersConfig.testingMode) {
      metrics?.addChain(1337);
      executor = new Executor({
        chainId: 1337,
        db: relayerDb,
        config: relayersConfig,
        logger: logger,
        getNodeApi,
        bundlingMode,
        metrics: metrics?.chains[1337] || null,
        version,
      });
    } else {
      metrics?.addChain(relayersConfig.chainId);
      executor = new Executor({
        chainId: relayersConfig.chainId,
        db: relayerDb,
        config: relayersConfig,
        logger: logger,
        getNodeApi,
        bundlingMode,
        metrics: metrics?.chains[relayersConfig.chainId] || null,
        version,
      });
    }

    const network = await Network.init({
      opts: nodeOptions.network,
      relayersConfig: relayersConfig,
      peerId: peerId,
      peerStoreDir: nodeOptions.network.dataDir,
      executor, // ok: is null at the moment
      metrics: metrics?.chains || null,
    });

    const syncService = new SyncService({
      network,
      metrics: metrics?.chains || null,
      executor,
      executorConfig: relayersConfig,
    });

    nodeApi = getApi({ network });

    await relayerDb.start();

    const server = await Server.init({
      ...nodeOptions.api,
      host: nodeOptions.api.address,
    });

    metricsOptions.enable
      ? await getHttpMetricsServer(
          metricsOptions.port,
          metricsOptions.host,
          metrics!.registry,
          logger
        )
      : null;

    const bundler = new ApiApp({
      server: server,
      config: relayersConfig,
      testingMode,
      redirectRpc,
      executor,
    });

    return new BundlerNode({
      network,
      server,
      bundler,
      nodeApi,
      executor,
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
