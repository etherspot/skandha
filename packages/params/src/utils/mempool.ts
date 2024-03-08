import { MempoolId } from "types/lib/sszTypes";
import { utils } from "ethers";

export function serializeMempoolId(mempoolId: string): Uint8Array {
  const id = utils.toUtf8Bytes(mempoolId);
  const serialized = MempoolId.defaultValue();
  serialized.set(id);
  return serialized;
}

export function deserializeMempoolId(byteArray: Uint8Array): string {
  return utils.toUtf8String(byteArray);
}

export function isMempoolIdEqual(a: Uint8Array | string, b: Uint8Array | string): boolean {
  if (typeof a == 'string') {
    a = serializeMempoolId(a);
  }
  if (typeof b == 'string') {
    b = serializeMempoolId(b);
  }
  if (a.length != b.length) return false;
  for (let i = 0; i < a.length; ++i) {
    if (a[i] != b[i]) return false;
  }
  return true;
}
