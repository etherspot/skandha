import { BytesLike, hexZeroPad, hexlify } from "ethers/lib/utils";
import RpcError from "types/lib/api/errors/rpc-error";

export function compareBytecode(
  artifactBytecode: string,
  contractBytecode: string
): number {
  if (artifactBytecode.length <= 2 || contractBytecode.length <= 2) return 0;

  if (typeof artifactBytecode === "string")
    artifactBytecode = artifactBytecode
      // eslint-disable-next-line no-useless-escape
      .replace(/\_\_\$/g, "000")
      // eslint-disable-next-line no-useless-escape
      .replace(/\$\_\_/g, "000");

  let matchedBytes = 0;
  for (let i = 0; i < artifactBytecode.length; i++) {
    if (artifactBytecode[i] === contractBytecode[i]) matchedBytes++;
  }
  if (isNaN(matchedBytes / artifactBytecode.length)) {
    return 0;
  }

  return matchedBytes / artifactBytecode.length;
}

export function toBytes32(b: BytesLike | number): string {
  return hexZeroPad(hexlify(b).toLowerCase(), 32);
}

export function requireCond(
  cond: boolean,
  msg: string,
  code?: number,
  data: any = undefined
): void {
  if (!cond) {
    throw new RpcError(msg, code, data);
  }
}
