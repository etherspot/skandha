import fs from "node:fs";
import findUp from "find-up";
import { readAndGetGitData } from "./git";

const __dirname = process.cwd();

type VersionJson = {
  /** "0.28.2" */
  version: string;
};

/**
 * Gathers all information on package version.
 * @returns a version string, e.g.
 */
export function getVersionData(): {
  version: string;
  commit: string;
} {
  const parts: string[] = [];
  const gitData = readAndGetGitData();

  /** Returns local version from `lerna.json` or `package.json` as `"0.28.2"` */
  const localVersion = readCliPackageJson() || readVersionFromLernaJson();
  if (localVersion) {
    parts.push(`v${localVersion}`);
  }

  return {
    // Guard against empty parts array
    version: parts.length > 0 ? parts.join("/") : "unknown",
    commit: gitData.commit,
  };
}

/** Read version information from lerna.json */
function readVersionFromLernaJson(): string | undefined {
  const filePath = findUp.sync("lerna.json", { cwd: __dirname });
  if (!filePath) return undefined;

  const lernaJson = JSON.parse(
    fs.readFileSync(filePath, "utf8")
  ) as VersionJson;
  return lernaJson.version;
}

/** Read version information from package.json */
function readCliPackageJson(): string | undefined {
  const filePath = findUp.sync("package.json", { cwd: __dirname });
  if (!filePath) return undefined;

  const packageJson = JSON.parse(
    fs.readFileSync(filePath, "utf8")
  ) as VersionJson;
  return packageJson.version;
}
