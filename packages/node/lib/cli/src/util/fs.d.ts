/**
 * Maybe create a directory
 */
export declare function mkdir(dirname: string): void;
/**
 * Attempts to unlink a file, return true if it is deleted, false if not found
 */
export declare function unlinkSyncMaybe(filepath: string): boolean;
/**
 * Attempts rm a dir, return true if it is deleted, false if not found
 */
export declare function rmdirSyncMaybe(dirpath: string): boolean;
/**
 * Find all files recursively in `dirPath`
 */
export declare function recursiveLookup(dirPath: string, filepaths?: string[]): string[];
//# sourceMappingURL=fs.d.ts.map