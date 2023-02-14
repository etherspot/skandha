import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import findUp from "find-up";
const __dirname = path.dirname(fileURLToPath(process.cwd()));
/**
 * Gathers all information on package version.
 * @returns a version string, e.g.
 */
export function getVersionData() {
    const parts = [];
    const commit = "";
    /** Returns local version from `lerna.json` or `package.json` as `"0.28.2"` */
    const localVersion = readCliPackageJson() || readVersionFromLernaJson();
    if (localVersion) {
        parts.push(`v${localVersion}`);
    }
    return {
        // Guard against empty parts array
        version: parts.length > 0 ? parts.join("/") : "unknown",
        commit,
    };
}
/** Read version information from lerna.json */
function readVersionFromLernaJson() {
    const filePath = findUp.sync("lerna.json", { cwd: __dirname });
    if (!filePath)
        return undefined;
    const lernaJson = JSON.parse(fs.readFileSync(filePath, "utf8"));
    return lernaJson.version;
}
/** Read version information from package.json */
function readCliPackageJson() {
    const filePath = findUp.sync("package.json", { cwd: __dirname });
    if (!filePath)
        return undefined;
    const packageJson = JSON.parse(fs.readFileSync(filePath, "utf8"));
    return packageJson.version;
}
//# sourceMappingURL=version.js.map