/* eslint-disable no-console */
import path, { resolve } from "node:path";
import { Server } from "api/lib/server";
import { ApiApp } from "api/lib/app";
import logger from "api/lib/logger";
import { Config } from "executor/lib/config";
import {
  Namespace,
  getNamespaceByValue,
  RocksDbController,
  LocalDbController,
} from "db/lib";
import { ConfigOptions } from "executor/lib/interfaces";
import { IDbController } from "types/lib";
import { mkdir, readFile } from "../../util";
import { IGlobalArgs } from "../../options";
import { IBundlerArgs } from "./index";

export async function bundlerHandler(
  args: IBundlerArgs & IGlobalArgs
): Promise<void> {
  const { dataDir, networksFile, testingMode, unsafeMode, redirectRpc } = args;

  let config: Config;
  try {
    const configPath = path.resolve(dataDir, "..", networksFile);
    const configOptions = readFile(configPath) as ConfigOptions;
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
    const dbPath = resolve(dataDir);
    mkdir(dbPath);

    db = new RocksDbController(
      resolve(dataDir),
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

  new ApiApp({
    server: server.application,
    config: config,
    db,
    testingMode,
    redirectRpc,
  });

  await server.listen();
}
