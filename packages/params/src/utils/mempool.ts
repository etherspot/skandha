import { MempoolId } from "@skandha/types/lib/sszTypes";
import { utils } from "ethers";

export function serializeMempoolId(mempoolId: string): Uint8Array {
  const hex = utils.hexlify(utils.toUtf8Bytes(mempoolId));
  return MempoolId.fromJson(hex);
}

export function deserializeMempoolId(byteArray: Uint8Array): string {
  const json = MempoolId.toJson(byteArray) as string;
  return utils.toUtf8String(json);
}
