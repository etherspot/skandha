import fs from "node:fs";
import path from "node:path";
import stream from "node:stream";
import { promisify } from "node:util";
import got from "got";
import { mkdir } from "./fs";
export var FileFormat;
(function (FileFormat) {
    FileFormat["json"] = "json";
    FileFormat["toml"] = "toml";
})(FileFormat || (FileFormat = {}));
/**
 * Parse file contents as Json.
 */
export function parse(contents, fileFormat) {
    switch (fileFormat) {
        case FileFormat.json:
            return JSON.parse(contents);
        default:
            return contents;
    }
}
/**
 * Stringify file contents.
 */
export function stringify(obj, fileFormat) {
    let contents;
    switch (fileFormat) {
        case FileFormat.json:
            contents = JSON.stringify(obj, null, 2);
            break;
        default:
            contents = obj;
    }
    return contents;
}
/**
 * Write a JSON serializable object to a file
 *
 * Serialize either to json, yaml, or toml
 */
export function writeFile(filepath, obj, options = "utf-8") {
    mkdir(path.dirname(filepath));
    const fileFormat = path.extname(filepath).substr(1);
    fs.writeFileSync(filepath, typeof obj === "string" ? obj : stringify(obj, fileFormat), options);
}
/**
 * Create a file with `600 (-rw-------)` permissions
 * *Note*: 600: Owner has full read and write access to the file,
 * while no other user can access the file
 */
export function writeFile600Perm(filepath, obj, options) {
    writeFile(filepath, obj, options);
    fs.chmodSync(filepath, "0600");
}
/**
 * Read a JSON serializable object from a file
 *
 * Parse either from json, yaml, or toml
 * Optional acceptedFormats object can be passed which can be an array of accepted formats, in future can be extended to include parseFn for the accepted formats
 */
export function readFile(filepath, acceptedFormats) {
    const fileFormat = path.extname(filepath).substr(1);
    if (acceptedFormats && !acceptedFormats.includes(fileFormat))
        throw new Error(`UnsupportedFileFormat: ${filepath}`);
    const contents = fs.readFileSync(filepath, "utf-8");
    return parse(contents, fileFormat);
}
/**
 * @see readFile
 * If `filepath` does not exist returns null
 */
export function readFileIfExists(filepath, acceptedFormats) {
    try {
        return readFile(filepath, acceptedFormats);
    }
    catch (e) {
        if (e.code === "ENOENT") {
            return null;
        }
        else {
            throw e;
        }
    }
}
/**
 * Download from URL or copy from local filesystem
 * @param urlOrPathSrc "/path/to/file.szz" | "https://url.to/file.szz"
 */
export async function downloadOrCopyFile(pathDest, urlOrPathSrc) {
    if (isUrl(urlOrPathSrc)) {
        await downloadFile(pathDest, urlOrPathSrc);
    }
    else {
        mkdir(path.dirname(pathDest));
        await fs.promises.copyFile(urlOrPathSrc, pathDest);
    }
}
/**
 * Downloads a genesis file per network if it does not exist
 */
export async function downloadFile(pathDest, url) {
    if (!fs.existsSync(pathDest)) {
        mkdir(path.dirname(pathDest));
        await promisify(stream.pipeline)(got.stream(url), fs.createWriteStream(pathDest));
    }
}
/**
 * Download from URL to memory or load from local filesystem
 * @param urlOrPathSrc "/path/to/file.szz" | "https://url.to/file.szz"
 */
export async function downloadOrLoadFile(pathOrUrl) {
    if (isUrl(pathOrUrl)) {
        const res = await got.get(pathOrUrl, { encoding: "binary" });
        return res.rawBody;
    }
    else {
        return await fs.promises.readFile(pathOrUrl);
    }
}
/**
 * Returns boolean for whether the string is a URL.
 */
function isUrl(pathOrUrl) {
    return pathOrUrl.startsWith("http");
}
//# sourceMappingURL=file.js.map