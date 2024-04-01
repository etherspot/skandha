export type RelayingMode =
  | "merkle"
  | "flashbots"
  | "classic"
  | "kolibri"
  | "echo";
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
