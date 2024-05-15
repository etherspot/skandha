import { Config } from "@skandha/executor/lib/config";
import { Namespace, getNamespaceByValue, RocksDbController } from "@skandha/db/lib";
import { NetworkConfig } from "@skandha/executor/lib/interfaces";
import { BundlerNode, IBundlerNodeOptions, defaultOptions } from "@skandha/node/lib";
import { initNetworkOptions } from "@skandha/node/lib";
import logger from "@skandha/api/lib/logger";
import { ExecutorOptions, ApiOptions, P2POptions } from "@skandha/types/lib/options";
import { MetricsOptions } from "@skandha/types/lib/options/metrics";
import { IGlobalArgs } from "../../options";
import { mkdir, readFile } from "../../util";
import { getVersionData } from "../../util/version";
import { initPeerIdAndEnr } from "./initPeerIdAndEnr";

export async function nodeHandler(args: IGlobalArgs): Promise<void> {
  logger.info("  ___                                            ___  ");
  logger.info(" (o o)                                          (o o) ");
  logger.info("(  V  ) Skandha - A modular typescript bundler (  V  )");
  logger.info("--m-m--------------------------------------------m-m--");
  logger.info("P2P is not yet available for EntryPoint v7. Stay tuned");
  return;

  // const params = await getNodeConfigFromArgs(args);

  // //create the necessary directories
  // mkdir(params.dataDir);

  // logger.info(`Using the configFile from ${params.configFile}`);
  // logger.info(`Initialised the dataDir at ${params.dataDir}`);
  // logger.info("Boot ENR: " + params.p2p["bootEnrs"].length);

  // let config: Config;
  // try {
  //   const networkConfig = readFile(params.configFile) as NetworkConfig;
  //   config = await Config.init({
  //     config: networkConfig,
  //     testingMode: params.testingMode,
  //     unsafeMode: params.unsafeMode,
  //     redirectRpc: params.redirectRpc,
  //   });
  // } catch (err) {
  //   if (err instanceof Error && err.message.indexOf("chain id") > -1) {
  //     logger.error(err.message);
  //     return;
  //   }
  //   logger.info("Config file not found. Proceeding with env vars...");
  //   config = await Config.init({
  //     config: null,
  //     testingMode: params.testingMode,
  //     unsafeMode: params.unsafeMode,
  //     redirectRpc: params.redirectRpc,
  //   });
  // }

  // const db = new RocksDbController(
  //   params.dataDir,
  //   getNamespaceByValue(Namespace.userOps)
  // );
  // await db.start();

  // const { enr, peerId } = await initPeerIdAndEnr(args, logger);

  // const options: IBundlerNodeOptions = {
  //   ...defaultOptions,
  //   api: {
  //     port: params.api["port"],
  //     address: params.api["address"],
  //     cors: params.api["cors"],
  //     enableRequestLogging: params.api["enableRequestLogging"],
  //   },
  //   network: initNetworkOptions(enr, params.p2p, params.dataDir),
  // };

  // const version = getVersionData();
  // const node = await BundlerNode.init({
  //   nodeOptions: options,
  //   relayersConfig: config,
  //   relayerDb: db,
  //   testingMode: params.testingMode,
  //   redirectRpc: params.redirectRpc,
  //   bundlingMode: params.executor.bundlingMode,
  //   peerId,
  //   metricsOptions: params.metrics,
  //   version,
  // });

  // await node.start();
}

export async function getNodeConfigFromArgs(args: IGlobalArgs): Promise<{
  configFile: string;
  dataDir: string;
  testingMode: boolean;
  unsafeMode: boolean;
  redirectRpc: boolean;
  p2p: P2POptions;
  api: ApiOptions;
  executor: ExecutorOptions;
  metrics: MetricsOptions;
}> {
  const entries = new Map(Object.entries(args));

  const ret = {
    configFile: entries.get("configFile"),
    dataDir: entries.get("dataDir"),
    unsafeMode: entries.get("unsafeMode"),
    testingMode: entries.get("testingMode"),
    redirectRpc: entries.get("redirectRpc"),
    enableMetrics: entries.get("enableMetrics"),
    p2p: {
      host: entries.get("p2p.host"),
      port: entries.get("p2p.port"),
      enrHost: entries.get("p2p.enrHost"),
      enrPort: entries.get("p2p.enrPort"),
      bootEnrs: entries.get("p2p.bootEnrs"),
      retainPeerId: entries.get("p2p.retainPeerId"),
    },
    api: {
      address: entries.get("api.address"),
      port: entries.get("api.port"),
      cors: entries.get("api.cors"),
      enableRequestLogging: entries.get("api.enableRequestLogging"),
    },
    executor: {
      bundlingMode: entries.get("executor.bundlingMode"),
    },
    metrics: {
      enable: entries.get("metrics.enable"),
      port: entries.get("metrics.port"),
      host: entries.get("metrics.host"),
    },
  };

  return ret;
}
