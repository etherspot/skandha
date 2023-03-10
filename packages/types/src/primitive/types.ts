import { ValueOf } from "@chainsafe/ssz";
import * as ssz from "./sszTypes.js";

export type Bytes4 = ValueOf<typeof ssz.Bytes4>;
export type Bytes8 = ValueOf<typeof ssz.Bytes8>;
export type Bytes20 = ValueOf<typeof ssz.Bytes20>;
export type Bytes32 = ValueOf<typeof ssz.Bytes32>;
export type Bytes48 = ValueOf<typeof ssz.Bytes48>;
export type Bytes96 = ValueOf<typeof ssz.Bytes96>;
export type Uint8 = ValueOf<typeof ssz.Uint8>;
export type Uint16 = ValueOf<typeof ssz.Uint16>;
export type Uint32 = ValueOf<typeof ssz.Uint32>;
export type UintNum64 = ValueOf<typeof ssz.UintNum64>;
export type UintNumInf64 = ValueOf<typeof ssz.UintNumInf64>;
export type UintBn64 = ValueOf<typeof ssz.UintBn64>;
export type UintBn128 = ValueOf<typeof ssz.UintBn128>;
export type UintBn256 = ValueOf<typeof ssz.UintBn256>;

export type Version = Bytes4;
export type Address = Bytes20;
export type Signature = Bytes96;
