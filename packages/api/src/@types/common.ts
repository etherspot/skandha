export type Optional<T, K extends keyof T> = Pick<Partial<T>, K> & Omit<T, K>;

export interface Log {
  blockNumber: number;
  blockHash: string;
  transactionIndex: number;

  removed: boolean;

  address: string;
  data: string;

  topics: Array<string>;

  transactionHash: string;
  logIndex: number;
}
