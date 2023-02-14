import { getDefaultDataDir } from "./rootDir";
/**
 * Defines the path structure of the globally used files
 *
 * ```bash
 * $dataDir
 * └── $paramsFile
 * ```
 */
export function getGlobalPaths(args, network) {
    // Set dataDir to network name iff dataDir is not set explicitly
    const dataDir = args.dataDir || getDefaultDataDir(network);
    return {
        dataDir,
    };
}
export const defaultGlobalPaths = getGlobalPaths({ dataDir: "$dataDir" }, "$network");
//# sourceMappingURL=global.js.map