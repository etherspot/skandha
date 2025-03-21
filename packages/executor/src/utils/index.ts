// import { BytesLike, hexlify } from "ethers/lib/utils";
import {Hex, toHex} from "viem";

export function extractAddrFromInitCode(data?: Hex): Hex | undefined {
  if (data == null) {
    return undefined;
  }
  const str = toHex(data);
  if (str.length >= 42) {
    return str.slice(0, 42) as Hex;
  }
  return undefined;
}

/**
 * Unix timestamp * 1000
 * @returns time in milliseconds
 */
export function now(): number {
  return new Date().getTime();
}

export function wait(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

export function getAddr(data?: Hex): Hex | undefined {
  if (data == null) {
    return undefined;
  }
  const str = toHex(data);
  if (str.length >= 42) {
    return str.slice(0, 42) as Hex;
  }
  return undefined;
}
