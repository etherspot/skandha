import path from "node:path";
import {IGlobalArgs} from "../../options";
import {getGlobalPaths, IGlobalPaths} from "../../paths/global";

export type BundlerPaths = Partial<{
  bundlerDir: string;
  peerStoreDir: string;
  dbDir: string;
  persistInvalidSszObjectsDir: string;
}>;

export interface IBundlerPaths {
  bundlerDir: string;
  peerStoreDir: string;
  dbDir: string;
  persistInvalidSszObjectsDir: string;
}

/**
 * Defines the path structure of the files relevant to the Bundler node
 *
 * ```bash
 * $dataDir
 * └── $BundlerDir
 *     ├── bundler.config.json
 *     ├── peer-id.json
 *     ├── enr
 *     ├── chain-db
 *     └── bundler.log
 * ```
 */
export function getBundlerPaths(
  // Using Pick<IGlobalArgs, "dataDir"> make changes in IGlobalArgs throw a type error here
  args: BundlerPaths & Pick<IGlobalArgs, "dataDir">,
  network: string
): IGlobalPaths & Required<BundlerPaths> {
  // Compute global paths first
  const globalPaths = getGlobalPaths(args, network);

  const dataDir = globalPaths.dataDir;
  const bundlerDir = dataDir;
  const dbDir = args.dbDir ?? path.join(bundlerDir, "chain-db");
  const persistInvalidSszObjectsDir = args.persistInvalidSszObjectsDir ?? path.join(bundlerDir, "invalidSszObjects");
  const peerStoreDir = args.peerStoreDir ?? path.join(bundlerDir, "peerstore");

  return {
    ...globalPaths,
    bundlerDir,
    dbDir,
    persistInvalidSszObjectsDir,
    peerStoreDir,
  };
}

/**
 * Constructs representations of the path structure to show in command's description
 */
export const defaultBundlerPaths = getBundlerPaths({dataDir: "$dataDir"}, "$network");