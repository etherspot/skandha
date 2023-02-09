export interface IReputationEntry {
  chainId: number;
  address: string;
  opsSeen: number;
  opsIncluded: number;
  lastUpdateTime: number;
}

export type ReputationEntryDump = Omit<IReputationEntry, 'chainId' | 'lastUpdateTime'>

export type ReputationEntrySerialized = Omit<IReputationEntry, 'address' | 'chainId'>

export enum ReputationStatus {
  OK, THROTTLED, BANNED
}
