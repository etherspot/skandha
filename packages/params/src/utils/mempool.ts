import { MempoolId } from "types/lib/sszTypes";
import { utils } from "ethers";
import { networksConfig } from "../networks";
import { mempoolsConfig } from "../mempools";

export function serializeMempoolId(mempoolId: string): Uint8Array {
  const hex = utils.hexlify(utils.toUtf8Bytes(mempoolId));
  return MempoolId.fromJson(hex);
}

export function deserializeMempoolId(byteArray: Uint8Array): string {
  const json = MempoolId.toJson(byteArray) as string;
  return utils.toUtf8String(json);
}

export function getCanonicalMempool(
  chainId: number,
  fallback: { entryPoint: string; mempoolId: string }
): {
  entryPoint: string;
  mempoolId: Uint8Array;
} {
  const config = networksConfig[chainId];
  if (config) {
    if (config.CANONICAL_MEMPOOL && mempoolsConfig[chainId]) {
      const mempoolConfig =
        mempoolsConfig[chainId]![
          deserializeMempoolId(config.CANONICAL_MEMPOOL)
        ];
      return {
        entryPoint: mempoolConfig.entrypoint,
        mempoolId: config.CANONICAL_MEMPOOL,
      };
    }
  }
  return {
    entryPoint: fallback.entryPoint,
    mempoolId: serializeMempoolId(fallback.mempoolId),
  };
}
