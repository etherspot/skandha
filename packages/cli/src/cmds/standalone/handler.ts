/* eslint-disable no-console */
import { resolve } from "node:path";
import { Server } from "api/lib/server";
import { ApiApp } from "api/lib/app";
import { Config } from "executor/lib/config";
import {
  Namespace,
  getNamespaceByValue,
  RocksDbController,
  LocalDbController,
} from "db/lib";
import { ConfigOptions } from "executor/lib/interfaces";
import { IDbController, NetworkName } from "types/lib";
import { Executors } from "executor/lib/interfaces";
import { Executor } from "executor/lib/executor";
import logger from "api/lib/logger";
import { mkdir, readFile } from "../../util";
import { IStandaloneGlobalArgs } from "../../options";

export async function bundlerHandler(
  args: IStandaloneGlobalArgs
): Promise<void> {
  const { dataDir, testingMode, unsafeMode, redirectRpc, configFile } = args;

  logger.info("  ___                                            ___  ");
  logger.info(" (o o)                                          (o o) ");
  logger.info("(  V  ) Skandha - A modular typescript bundler (  V  )");
  logger.info("--m-m--------------------------------------------m-m--");

  logger.info(`Using the configFile from ${configFile}`);
  logger.info(`Initialised the dataDir at ${dataDir}`);
  logger.info("----- Running in STANDALONE MODE -----");

  let config: Config;
  try {
    const configOptions = readFile(configFile) as ConfigOptions;
    config = new Config({
      networks: configOptions.networks,
      testingMode,
      unsafeMode,
      redirectRpc,
    });
  } catch (err) {
    logger.debug("Config file not found. Proceeding with env vars...");
    config = new Config({
      networks: {},
      testingMode,
      unsafeMode,
      redirectRpc,
    });
  }

  if (unsafeMode) {
    logger.warn(
      "WARNING: Running in unsafe mode, skips opcode check and stake check"
    );
  }
  if (redirectRpc) {
    logger.warn(
      "WARNING: RPC redirecting is enabled, redirects RPC whitelisted calls to RPC"
    );
  }

  let db: IDbController;

  if (testingMode) {
    db = new LocalDbController(getNamespaceByValue(Namespace.userOps));
  } else {
    const dbPath = resolve(dataDir, "db");
    mkdir(dbPath);

    db = new RocksDbController(
      resolve(dataDir, "db"),
      getNamespaceByValue(Namespace.userOps)
    );
    await db.start();
  }

  const server = await Server.init({
    enableRequestLogging: args["api.enableRequestLogging"],
    port: args["api.port"],
    host: args["api.address"],
    cors: args["api.cors"],
  });

  const executors: Executors = new Map<NetworkName, Executor>();
  if (config.testingMode) {
    const executor = new Executor({
      network: "dev",
      db: db,
      config: config,
      logger: logger,
      bundlingMode: args["executor.bundlingMode"],
    });
    executors.set("dev", executor);
  } else {
    for (const network of config.supportedNetworks) {
      const executor = new Executor({
        network,
        db: db,
        config: config,
        logger: logger,
        bundlingMode: args["executor.bundlingMode"],
      });
      executors.set(network, executor);
    }
  }

  new ApiApp({
    server: server.application,
    config: config,
    db,
    testingMode,
    redirectRpc,
    executors,
  });

  await server.listen();
}
