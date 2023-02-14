import fs from "node:fs";
import path from "node:path";
/**
 * Maybe create a directory
 */
export function mkdir(dirname) {
    if (!fs.existsSync(dirname))
        fs.mkdirSync(dirname, { recursive: true });
}
/**
 * Attempts to unlink a file, return true if it is deleted, false if not found
 */
export function unlinkSyncMaybe(filepath) {
    try {
        fs.unlinkSync(filepath);
        return true;
    }
    catch (e) {
        const { code } = e;
        if (code === "ENOENT")
            return false;
        else
            throw e;
    }
}
/**
 * Attempts rm a dir, return true if it is deleted, false if not found
 */
export function rmdirSyncMaybe(dirpath) {
    try {
        fs.rmSync(dirpath, { recursive: true });
        return true;
    }
    catch (e) {
        const { code } = e;
        // about error codes https://nodejs.org/api/fs.html#fspromisesrmdirpath-options
        // ENOENT error on Windows and an ENOTDIR
        if (code === "ENOENT" || code === "ENOTDIR")
            return false;
        else
            throw e;
    }
}
/**
 * Find all files recursively in `dirPath`
 */
export function recursiveLookup(dirPath, filepaths = []) {
    if (fs.statSync(dirPath).isDirectory()) {
        for (const filename of fs.readdirSync(dirPath)) {
            recursiveLookup(path.join(dirPath, filename), filepaths);
        }
    }
    else {
        filepaths.push(dirPath);
    }
    return filepaths;
}
//# sourceMappingURL=fs.js.map