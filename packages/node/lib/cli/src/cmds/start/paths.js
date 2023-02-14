import path from "node:path";
import { getGlobalPaths } from "../../paths/global";
/**
 * Defines the path structure of the files relevant to the Bundler node
 *
 * ```bash
 * $dataDir
 * └── $BundlerDir
 *     ├── bundler.config.json
 *     ├── peer-id.json
 *     ├── enr
 *     ├── mempool-db
 *     └── bundler.log
 * ```
 */
export function getBundlerPaths(
// Using Pick<IGlobalArgs, "dataDir"> make changes in IGlobalArgs throw a type error here
args, network) {
    var _a, _b, _c;
    // Compute global paths first
    const globalPaths = getGlobalPaths(args, network);
    const dataDir = globalPaths.dataDir;
    const bundlerDir = dataDir;
    const dbDir = (_a = args.dbDir) !== null && _a !== void 0 ? _a : path.join(bundlerDir, "mempool-db");
    const persistInvalidSszObjectsDir = (_b = args.persistInvalidSszObjectsDir) !== null && _b !== void 0 ? _b : path.join(bundlerDir, "invalidSszObjects");
    const peerStoreDir = (_c = args.peerStoreDir) !== null && _c !== void 0 ? _c : path.join(bundlerDir, "peerstore");
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
export const defaultBundlerPaths = getBundlerPaths({ dataDir: "$dataDir" }, "$network");
//# sourceMappingURL=paths.js.map