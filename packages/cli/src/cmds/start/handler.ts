/* eslint-disable no-console */
import * as fs from "node:fs";
import { homedir } from "node:os";
import path, { resolve } from "node:path";
import { Config } from "executor/lib/config";
import {
  Namespace,
  getNamespaceByValue,
  RocksDbController,
  LocalDbController,
} from "db/lib";
import { ConfigOptions } from "executor/lib/config";
import { IDbController } from "types/lib";
import { BundlerNode, IBundlerNodeOptions, defaultOptions } from "node/lib";
import { buildDefaultNetworkOptions } from "node/lib";
import logger from "api/lib/logger";
import { mkdir, readFile } from "../../util";
import { IGlobalArgs } from "../../options";
import { IBundlerArgs } from "./index";

export async function bundlerHandler(
  args: IBundlerArgs & IGlobalArgs
): Promise<void> {
  const { dataDir, networksFile, testingMode, unsafeMode } = args;

  let config: Config;
  try {
    const configPath = path.resolve(dataDir, networksFile);
    const configOptions = readFile(configPath) as ConfigOptions;
    config = new Config({
      networks: configOptions.networks,
      testingMode,
      unsafeMode,
    });
  } catch (err) {
    logger.info("Config file not found. Proceeding with env vars...");
    config = new Config({
      networks: {},
      testingMode,
      unsafeMode,
    });
  }

  let db: IDbController;
  const dbPath =
    args["p2p.dataDir"] !== "db"
      ? args["p2p.dataDir"]
      : `${homedir()}/.skandha/`;

  if (fs.existsSync(dbPath)) {
    logger.info("Mempool already present, reusing path " + dbPath);
  } else {
    mkdir(dbPath);
    logger.info("Initialising db at " + dbPath);
  }

  if (testingMode) {
    db = new LocalDbController(
      resolve(dbPath, getNamespaceByValue(Namespace.userOps))
    );
  } else {
    db = new RocksDbController(
      resolve(dbPath, args["p2p.dataDir"]),
      getNamespaceByValue(Namespace.userOps)
    );
  }

  const options: IBundlerNodeOptions = {
    ...defaultOptions,
    api: {
      port: args["api.port"],
      address: args["api.address"],
      cors: args["api.cors"],
      enableRequestLogging: args["api.enableRequestLogging"],
    },
    network: buildDefaultNetworkOptions(
      args["p2p.host"],
      args["p2p.port"],
      args["p2p.bootEnrs"],
      resolve(dbPath, args["p2p.dataDir"], "p2p")
    ),
  };

  const node = await BundlerNode.init({
    nodeOptions: options,
    relayersConfig: config,
    relayerDb: db,
    testingMode,
  });

  await node.start();
}
