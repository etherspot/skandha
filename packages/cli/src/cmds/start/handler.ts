/* eslint-disable no-console */
import path, { resolve } from "node:path";
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
import { IDbController } from "types/lib";
import { mkdir, readFile } from "../../util";
import { IGlobalArgs } from "../../options";
import { IBundlerArgs } from "./index";

export async function bundlerHandler(
  args: IBundlerArgs & IGlobalArgs
): Promise<void> {
  const { dataDir, networksFile, testingMode } = args;

  let config: Config;
  try {
    const configPath = path.resolve(dataDir, networksFile);
    const configOptions = readFile(configPath) as ConfigOptions;
    config = new Config({
      networks: configOptions.networks,
      testingMode: testingMode,
    });
  } catch (err) {
    console.log("Config file not found. Proceeding with env vars...");
    config = new Config({
      networks: {},
      testingMode,
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

  const server = new Server({
    enableRequestLogging: args["api.enableRequestLogging"],
    port: args["api.port"],
    host: args["api.address"],
  });

  new ApiApp({
    server: server.application,
    config: config,
    db,
    testingMode,
  });

  server.listen();
}
