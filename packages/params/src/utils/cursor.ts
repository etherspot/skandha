import * as ts from "types/lib/primitive/types";
import * as ssz from "types/lib/primitive/sszTypes";
import { ethers } from "ethers";

export function bytes32ToNumber(bytes: ts.Bytes32): number {
  return ethers.BigNumber.from(ssz.Bytes32.toJson(bytes)).toNumber()
}

export function numberToBytes32(number: number): ts.Bytes32 {
  return ssz.Bytes32.fromJson((number).toString(16).padStart(64, '0'));
}
