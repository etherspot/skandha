import { getUint8ByteToBitBooleanArray } from "@chainsafe/ssz";
import { ssz } from "types/lib";

export function newFilledArray<T>(n: number, val: T): T[] {
  const arr = new Array<T>(n);
  for (let i = 0; i < n; ++i) {
    arr[i] = val;
  }
  return arr;
}

export const zeroMempoolnets = newFilledArray(
  ssz.MEMPOOL_ID_SUBNET_COUNT,
  false
);

/**
 * Fast deserialize a BitVector, with pre-cached bool array in `getUint8ByteToBitBooleanArray()`
 *
 * Never throw a deserialization error:
 * - if bytes is too short, it will pad with zeroes
 * - if bytes is too long, it will ignore the extra values
 */
export function deserializeEnrSubnets(
  bytes: Uint8Array,
  subnetCount: number
): boolean[] {
  if (subnetCount <= 8) {
    return getUint8ByteToBitBooleanArray(bytes[0] ?? 0);
  }

  let boolsArr: boolean[] = [];
  const byteCount = Math.ceil(subnetCount / 8);
  for (let i = 0; i < byteCount; i++) {
    boolsArr = boolsArr.concat(getUint8ByteToBitBooleanArray(bytes[i] ?? 0));
  }

  return boolsArr;
}
