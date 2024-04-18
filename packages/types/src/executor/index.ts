export type SkandhaVersion = {
  /** "0.28.2" */
  version: string;
  commit: string;
};

export type RelayingMode =
  | "merkle"
  | "flashbots"
  | "classic"
  | "kolibri"
  | "echo"
  | "fastlane";
export interface SendBundleReturn {
  transactionHash: string;
  userOpHashes: string[];
}

export enum ReputationStatus {
  OK = 0,
  THROTTLED = 1,
  BANNED = 2,
}

export * from "./validation";
export * from "./IWhitelistedEntities";
export * from "./entities";
