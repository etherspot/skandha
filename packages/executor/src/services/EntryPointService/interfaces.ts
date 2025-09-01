export enum EntryPointVersion {
  SIX = 6,
  SEVEN = 7,
  UNKNOWN = 0,
}

export type StateOverrides = {
  [address: string]: {
    code: string;
  };
};

export enum BinarySearchResultType {
  Success = 0,
  OutOfGas = 1,
}
