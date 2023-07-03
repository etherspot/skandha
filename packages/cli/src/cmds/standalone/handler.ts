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
import { ConfigOptions } from "executor/lib/config";
import { IDbController, NetworkName } from "types/lib";
import { Executors } from "executor/lib/interfaces";
import { Executor } from "executor/lib/executor";
import logger from "api/lib/logger";
import { mkdir, readFile } from "../../util";
import { IGlobalArgs } from "../../options";
import { IBundlerArgs } from "./index";

export async function bundlerHandler(
  args: IBundlerArgs & IGlobalArgs
): Promise<void> {
  const {
    dataDir,
    configFile,
    testingMode,
    unsafeMode,
    redirectRpc,
    manualBundling,
  } = args;

  let config: Config;
  try {
    const configOptions = readFile(configFile) as ConfigOptions;
    config = new Config({
      networks: configOptions.networks,
      testingMode,
      unsafeMode,
    });
  } catch (err) {
    console.log("Config file not found. Proceeding with env vars...");
    config = new Config({
      networks: {},
      testingMode,
      unsafeMode,
    });
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
  for (const network of config.supportedNetworks) {
    const executor = new Executor({
      network,
      db: db,
      config: config,
      logger: logger,
      manualBundling,
    });
    executors.set(network, executor);
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
