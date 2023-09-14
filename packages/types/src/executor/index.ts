export interface SendBundleReturn {
  transactionHash: string;
  userOpHashes: string[];
}

export enum ReputationStatus {
  ok = "ok",
  throttled = "throttled",
  banned = "banned",
}

export * from "./validation";
