import { IGlobalArgs } from "../../options";
import { IGlobalPaths } from "../../paths/global";
export declare type BundlerPaths = Partial<{
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
 *     ├── mempool-db
 *     └── bundler.log
 * ```
 */
export declare function getBundlerPaths(args: BundlerPaths & Pick<IGlobalArgs, "dataDir">, network: string): IGlobalPaths & Required<BundlerPaths>;
/**
 * Constructs representations of the path structure to show in command's description
 */
export declare const defaultBundlerPaths: IGlobalPaths & Required<Partial<{
    bundlerDir: string;
    peerStoreDir: string;
    dbDir: string;
    persistInvalidSszObjectsDir: string;
}>>;
//# sourceMappingURL=paths.d.ts.map