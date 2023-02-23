import { IGlobalArgs } from "../options";
import { getDefaultDataDir } from "./rootDir";

export interface IGlobalPaths {
  dataDir: string;
}

/**
 * Defines the path structure of the globally used files
 *
 * ```bash
 * $dataDir
 * └── $networksFile
 * ```
 */
export function getGlobalPaths(
  args: Partial<IGlobalArgs>,
  network: string
): IGlobalPaths {
  // Set dataDir to network name iff dataDir is not set explicitly
  const dataDir = args.dataDir || getDefaultDataDir(network);
  return {
    dataDir,
  };
}

export const defaultGlobalPaths = getGlobalPaths(
  { dataDir: "$dataDir" },
  "$networks"
);
