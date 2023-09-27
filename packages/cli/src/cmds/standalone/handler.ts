/* eslint-disable no-console */
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
import { IDbController } from "types/lib";
import { Executors } from "executor/lib/interfaces";
import { Executor } from "executor/lib/executor";
import logger from "api/lib/logger";
import { mkdir, readFile } from "../../util";
import { IStandaloneGlobalArgs } from "../../options";

export async function bundlerHandler(
  args: IStandaloneGlobalArgs
): Promise<void> {
  const { dataDir, testingMode, unsafeMode, redirectRpc, configFile } = args;

  //create the necessary directories
  mkdir(dataDir);

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
    config = await Config.init({
      networks: configOptions.networks,
      testingMode,
      unsafeMode,
      redirectRpc,
    });
  } catch (err) {
    if (err instanceof Error && err.message.indexOf("chain id") > -1) {
      logger.error(err.message);
      return;
    }
    logger.debug("Config file not found. Proceeding with env vars...");
    config = await Config.init({
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
    db = new RocksDbController(dataDir, getNamespaceByValue(Namespace.userOps));
    await db.start();
  }

  const server = await Server.init({
    enableRequestLogging: args["api.enableRequestLogging"],
    port: args["api.port"],
    host: args["api.address"],
    cors: args["api.cors"],
  });

  const executors: Executors = new Map<number, Executor>();
  if (config.testingMode) {
    const executor = new Executor({
      network: "dev",
      chainId: 1337,
      db: db,
      config: config,
      logger: logger,
      bundlingMode: args["executor.bundlingMode"],
    });
    executors.set(1337, executor);
  } else {
    for (const [network, chainId] of Object.entries(config.supportedNetworks)) {
      const executor = new Executor({
        network,
        chainId,
        db: db,
        config: config,
        logger: logger,
        bundlingMode: args["executor.bundlingMode"],
      });
      executors.set(chainId, executor);
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
