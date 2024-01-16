import { ts } from "types/lib";
import { AllChainsMetrics } from "monitoring/lib";
import { Executor } from "executor/lib/executor";
import { Config } from "executor/lib/config";
import { INetwork } from "../network/interface";

export interface ISyncService {
  state: SyncState;
  close(): void;
  isSynced(): boolean;
  isSyncing(): boolean;
}

export enum SyncState {
  /** No useful peers are connected */
  Stalled = "Stalled",
  /** The node is syncing */
  Syncing = "Syncing",
  /** The node is up to date with all known peers */
  Synced = "Synced",
}

export enum PeerSyncState {
  /** New peer */
  New = "New",
  /** The peer is syncing */
  Syncing = "Syncing",
  /** The peer is synced */
  Synced = "Synced",
}

export interface PeerState {
  syncState: PeerSyncState;
  status?: ts.Status;
  metadata?: ts.Metadata;
}

// eslint-disable-next-line @typescript-eslint/ban-types
export type SyncOptions = {};

export interface SyncModules {
  network: INetwork;
  metrics: AllChainsMetrics | null;
  executor: Executor;
  executorConfig: Config;
}
