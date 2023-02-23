/* eslint-disable no-console */
import path, { resolve } from "node:path";
import { Server } from "bundler/lib/server";
import { ApiApp } from "bundler/lib/app";
import { Config } from "relayer/lib/config";
import { Namespace, DbController, getNamespaceByValue } from "db/lib";
import { ConfigOptions } from "relayer/lib/config";
import { mkdir, readFile } from "../../util";
import { IGlobalArgs } from "../../options";
import { IBundlerArgs } from "./index";

export async function bundlerHandler(
  args: IBundlerArgs & IGlobalArgs
): Promise<void> {
  const { dataDir, networksFile } = args;
  const configPath = path.resolve(dataDir, networksFile);
  const configOptions = readFile(configPath) as ConfigOptions;
  const config = new Config(configOptions);

  const dbPath = resolve(dataDir, "db");
  mkdir(dbPath);

  const db = new DbController(
    resolve(dataDir, "db"),
    getNamespaceByValue(Namespace.userOps)
  );
  await db.start();

  const server = new Server();

  new ApiApp({
    server: server.application,
    config: config,
    db,
  });

  server.listen(14337);
}
