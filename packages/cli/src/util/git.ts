import { execSync } from "node:child_process";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";

/** Git data type used to construct version information string and persistence. */
export type GitData = {
  branch: string;
  commit: string;
};

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const gitDataPath = path.resolve(__dirname, "../../.git-data.json");

/** Writes a persistent git data file. */
export function writeGitDataFile(gitData: GitData): void {
  fs.writeFileSync(gitDataPath, JSON.stringify(gitData, null, 2));
}

/** Reads the persistent git data file. */
export function readGitDataFile(): GitData {
  return JSON.parse(fs.readFileSync(gitDataPath, "utf8")) as GitData;
}

export function readAndGetGitData(): GitData {
  try {
    // Gets git data containing current branch and commit info from persistent file.
    let persistedGitData: Partial<GitData>;
    try {
      persistedGitData = readGitDataFile();
    } catch (e) {
      persistedGitData = {};
    }

    const currentGitData = getGitData();

    return {
      // If the CLI is run from source, prioritze current git data
      // over `.git-data.json` file, which might be stale here.
      branch:
        currentGitData.branch && currentGitData.branch.length > 0
          ? currentGitData.branch
          : persistedGitData.branch ?? "",
      commit:
        currentGitData.commit && currentGitData.commit.length > 0
          ? currentGitData.commit
          : persistedGitData.commit ?? "",
    };
  } catch (e) {
    return {
      branch: "",
      commit: "",
    };
  }
}

/** Gets git data containing current branch and commit info from CLI. */
export function getGitData(): GitData {
  return {
    branch: getBranch(),
    commit: getCommit(),
  };
}

/** Tries to get branch from git CLI. */
export function getBranch(): string {
  try {
    return shellSilent("git rev-parse --abbrev-ref HEAD");
  } catch (e) {
    return "";
  }
}

/** Tries to get commit from git from git CLI. */
export function getCommit(): string {
  try {
    return shellSilent("git rev-parse --verify HEAD");
  } catch (e) {
    return "";
  }
}

/** Silent shell that won't pollute stdout, or stderr */
function shellSilent(cmd: string): string {
  return execSync(cmd, { stdio: ["ignore", "pipe", "ignore"] })
    .toString()
    .trim();
}
