/* eslint-disable no-console */
import { Config } from "executor/lib/config";
import { Namespace, getNamespaceByValue, RocksDbController } from "db/lib";
import { ConfigOptions } from "executor/lib/config";
import { IDbController } from "types/lib";
import { BundlerNode, IBundlerNodeOptions, defaultOptions } from "node/lib";
import { buildDefaultNetworkOptions } from "node/lib";
import logger from "api/lib/logger";
import { IGlobalArgs } from "../../options";
import { mkdir, readFile } from "../../util";
import { INodeArgs } from "./options";

export interface P2pOptions {
  host: string;
  port: number;
  bootEnrs: string[];
  dataDir: string;
}

export interface ApiOptions {
  host: string;
  port: number;
  cors: string;
  enableRequestLogging: boolean;
}

export async function nodeHandler(
  args: INodeArgs & IGlobalArgs
): Promise<void> {
  const params = await getNodeConfigFromArgs(args);

  //create the necessary directories
  mkdir(params.dataDir);
  mkdir(params.p2p.dataDir);

  logger.info("  ___                                            ___  ");
  logger.info(" (o o)                                          (o o) ");
  logger.info("(  V  ) Skandha - A modular typescript bundler (  V  )");
  logger.info("--m-m--------------------------------------------m-m--");

  logger.info(`Using the configFile from ${params.configFile}`);
  logger.info(`Initialised the dataDir at ${params.dataDir}`);
  logger.info(`Initialised the peerStoreDir at ${params.p2p.dataDir}`);
  logger.info("Boot ENR: " + params.p2p["bootEnrs"].length);

  let config: Config;
  let db: IDbController;
  try {
    const configOptions = readFile(params.configFile) as ConfigOptions;
    config = new Config({
      networks: configOptions.networks,
      testingMode: params.testingMode,
      unsafeMode: params.unsafeMode,
    });
  } catch (err) {
    logger.info("Config file not found. Proceeding with env vars...");
    config = new Config({
      networks: {},
      testingMode: false,
      unsafeMode: false,
    });
  }

  db = new RocksDbController(
    params.dataDir,
    getNamespaceByValue(Namespace.userOps)
  );

  const options: IBundlerNodeOptions = {
    ...defaultOptions,
    api: {
      port: params.api["port"],
      address: params.api["host"],
      cors: params.api["cors"],
      enableRequestLogging: params.api["enableRequestLogging"],
    },
    network: buildDefaultNetworkOptions(
      params.p2p["host"],
      params.p2p["port"],
      params.p2p["bootEnrs"],
      params.p2p["dataDir"]
    ),
  };

  const node = await BundlerNode.init({
    nodeOptions: options,
    relayersConfig: config,
    relayerDb: db,
    testingMode: params.testingMode,
    redirectRpc: params.redirectRpc,
  });

  await node.start();
}

export async function getNodeConfigFromArgs(
  args: INodeArgs & IGlobalArgs
): Promise<{
  configFile: string;
  dataDir: string;
  testingMode: boolean;
  unsafeMode: boolean;
  redirectRpc: boolean;
  p2p: P2pOptions;
  api: ApiOptions;
}> {
  const entries = new Map(Object.entries(args));

  const ret = {
    configFile: entries.get("configFile"),
    dataDir: entries.get("dataDir"),
    unsafeMode: entries.get("unsafeMode"),
    testingMode: entries.get("testingMode"),
    redirectRpc: entries.get("redirectRpc"),
    p2p: {
      host: entries.get("p2p.host"),
      port: entries.get("p2p.port"),
      bootEnrs: entries.get("p2p.bootEnrs"),
      dataDir: entries.get("p2p.dataDir"),
    },
    api: {
      host: entries.get("api.address"),
      port: entries.get("api.port"),
      cors: entries.get("api.cors"),
      enableRequestLogging: entries.get("api.enableRequestLogging"),
    },
  };

  return ret;
}
