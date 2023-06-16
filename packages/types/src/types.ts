import { ValueOf } from "@chainsafe/ssz";
export * from "./primitive/types";
import * as ssz from "./sszTypes";

export type Metadata = ValueOf<typeof ssz.Metadata>;
export type UserOp = ValueOf<typeof ssz.UserOp>;
export type UserOpsWithEntryPoint = ValueOf<typeof ssz.UserOpsWithEntryPoint>;
export type PooledUserOps = ValueOf<typeof ssz.PooledUserOps>;
export type Goodbye = ValueOf<typeof ssz.Goodbye>;
export type Ping = ValueOf<typeof ssz.Ping>;
export type Status = ValueOf<typeof ssz.Status>;
export type PooledUserOpHashesRequest = ValueOf<
  typeof ssz.PooledUserOpHashesRequest
>;
export type PooledUserOpHashes = ValueOf<typeof ssz.PooledUserOpHashes>;
export type PooledUserOpsByHashRequest = ValueOf<
  typeof ssz.PooledUserOpsByHashRequest
>;
export type PooledUserOpsByHash = ValueOf<typeof ssz.PooledUserOpsByHash>;

export type addPrefix<TKey, TPrefix extends string> = TKey extends string
  ? `${TPrefix}${TKey}`
  : never;
export type addSuffix<TKey, TSuffix extends string> = TKey extends string
  ? `${TKey}${TSuffix}`
  : never;

// Network
// ========

export type MempoolSubnets = ValueOf<typeof ssz.MempoolSubnets>;
