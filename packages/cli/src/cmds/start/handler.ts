import path from "node:path";
import {Registry} from "prom-client";
import {createSecp256k1PeerId} from "@libp2p/peer-id-factory";
import {DbController} from "db";
import {
  BundlerNode,
  BundlerDb,
  createNodeJsLibp2p,
} from "@etherspot/bundler/bundle";
import { createIBundlerConfig } from "@etherspot/bundler/config";
import { createKeypairFromPeerId, SignableENR } from "@chainsafe/discv5";

import {IGlobalArgs, parseBundlerNodeArgs} from "../../options";
import {
  bundlerNodeOptions,
  exportToJSON,
  getbundlerConfigFromArgs,
} from "../../config";
import {
  getNetworkBootnodes,
  getNetworkData,
  isKnownNetworkName,
  readBootnodes,
} from "../../networks";
import {
  onGracefulShutdown,
  getCliLogger,
  mkdir,
  writeFile600Perm,
  cleanOldLogFiles,
} from "../../util/";
import {getVersionData} from "../../util/version";
import {defaultP2pPort} from "../../options/bundlerNodeOptions";
import {IBundlerArgs} from "./options";
import {getBundlerPaths} from "./paths";
import {initBundlerState} from "./initBundlerState";

/**
 * Runs a bundler node.
 */
export async function bundlerHandler(
  args: IBundlerArgs & IGlobalArgs
): Promise<void> {
  const {config, options, bundlerPaths, network, version, commit, peerId} =
    await bundlerHandlerInit(args);

  // initialize directories
  mkdir(bundlerPaths.dataDir);
  mkdir(bundlerPaths.bundlerDir);
  mkdir(bundlerPaths.dbDir);

  const abortController = new AbortController();
  const {logger, logParams} = getCliLogger(
    args,
    {defaultLogFilepath: path.join(bundlerPaths.dataDir, "bundler.log")},
    config
  );
  try {
    cleanOldLogFiles(logParams.filename, logParams.rotateMaxFiles);
  } catch (e) {
    logger.debug("Not able to delete log files", logParams, e as Error);
  }

  onGracefulShutdown(async () => {
    abortController.abort();
  }, logger.info.bind(logger));

  logger.info("Lodestar", { network, version, commit });
  // Callback for bundler to request forced exit, for e.g. in case of irrecoverable
  // forkchoice errors
  const processShutdownCallback: ProcessShutdownCallback = (err) => {
    logger.error("Process shutdown requested", {}, err);
    process.kill(process.pid, "SIGINT");
  };

  // additional metrics registries
  const metricsRegistries: Registry[] = [];
  let networkRegistry: Registry | undefined;
  if (options.metrics.enabled) {
    networkRegistry = new Registry();
    metricsRegistries.push(networkRegistry);
  }
  const db = new BundlerDb({
    config,
    controller: new DbController(options.db, {metrics: null}),
  });

  await db.start();
  logger.info("Connected to RocksDB database", { path: options.db.name });

  // bundlerNode setup
  try {
    const {anchorState, wsCheckpoint} = await initBundlerState(
      options,
      args,
      config,
      db,
      logger,
      abortController.signal
    );
    const bundlerConfig = createIBundlerConfig(
      config,
      anchorState.genesisValidatorsRoot
    );
    const node = await BundlerNode.init({
      opts: options,
      config: bundlerConfig,
      db,
      logger,
      processShutdownCallback,
      libp2p: await createNodeJsLibp2p(peerId, options.network, {
        peerStoreDir: bundlerPaths.peerStoreDir,
        metrics: options.metrics.enabled,
        metricsRegistry: networkRegistry,
      }),
      anchorState,
      wsCheckpoint,
      metricsRegistries,
    });

    if (args.attachToGlobalThis)
      (globalThis as unknown as { bn: BundlerNode }).bn = node;

    abortController.signal.addEventListener("abort", () => node.close(), {
      once: true,
    });
  } catch (e) {
    await db.stop();

    if (e instanceof ErrorAborted) {
      logger.info(e.message); // Let the user know the abort was received but don't print as error
    } else {
      throw e;
    }
  }
}

/** Separate function to simplify unit testing of options merging */
// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export async function bundlerHandlerInit(args: IBundlerArgs & IGlobalArgs) {
  const {config, network} = getbundlerConfigFromArgs(args);

  const bundlerNodeOptions = new BundlerNodeOptions(parseBundlerNodeArgs(args));

  const {version, commit} = getVersionData();
  const bundlerPaths = getBundlerPaths(args, network);
  // TODO: Rename db.name to db.path or db.location
  bundlerNodeOptions.set({db: {name: bundlerPaths.dbDir}});
  bundlerNodeOptions.set({
    chain: {
      persistInvalidSszObjectsDir: bundlerPaths.persistInvalidSszObjectsDir,
    },
  });
  // Add metrics metadata to show versioning + network info in Prometheus + Grafana
  bundlerNodeOptions.set({
    metrics: {metadata: {version, commit, network}},
  });
  // Add detailed version string for API node/version endpoint
  bundlerNodeOptions.set({api: {version}});

  // Fetch extra bootnodes
  const extraBootnodes = (
    bundlerNodeOptions.get().network?.discv5?.bootEnrs ?? []
  ).concat(
    args.bootnodesFile ? readBootnodes(args.bootnodesFile) : [],
    isKnownNetworkName(network) ? await getNetworkBootnodes(network) : []
  );
  bundlerNodeOptions.set({network: {discv5: {bootEnrs: extraBootnodes}}});

  // Set known depositContractDeployBlock
  if (isKnownNetworkName(network)) {
    const {depositContractDeployBlock} = getNetworkData(network);
    bundlerNodeOptions.set({eth1: {depositContractDeployBlock}});
  }

  // Create new PeerId everytime by default, unless peerIdFile is provided
  const peerId = await createSecp256k1PeerId();
  const enr = SignableENR.createV4(createKeypairFromPeerId(peerId));
  overwriteEnrWithCliArgs(enr, args);

  // Persist ENR and PeerId in bundlerDir fixed paths for debugging
  const pIdPath = path.join(bundlerPaths.bundlerDir, "peer_id.json");
  const enrPath = path.join(bundlerPaths.bundlerDir, "enr");
  writeFile600Perm(pIdPath, exportToJSON(peerId));
  writeFile600Perm(enrPath, enr.encodeTxt());

  // Inject ENR to bundler options
  bundlerNodeOptions.set({
    network: {discv5: {enr, enrUpdate: !enr.ip && !enr.ip6}},
  });
  // Add simple version string for libp2p agent version
  bundlerNodeOptions.set({network: {version: version.split("/")[0]}});

  // Render final options
  const options = bundlerNodeOptions.getWithDefaults();

  return {config, options, bundlerPaths, network, version, commit, peerId};
}

export function overwriteEnrWithCliArgs(
  enr: SignableENR,
  args: IBundlerArgs
): void {
  // TODO: Not sure if we should propagate port/defaultP2pPort options to the ENR
  enr.tcp = args["enr.tcp"] ?? args.port ?? defaultP2pPort;
  const udpPort =
    args["enr.udp"] ?? args.discoveryPort ?? args.port ?? defaultP2pPort;
  if (udpPort != null) enr.udp = udpPort;
  if (args["enr.ip"] != null) enr.ip = args["enr.ip"];
  if (args["enr.ip6"] != null) enr.ip6 = args["enr.ip6"];
  if (args["enr.tcp6"] != null) enr.tcp6 = args["enr.tcp6"];
  if (args["enr.udp6"] != null) enr.udp6 = args["enr.udp6"];
}
