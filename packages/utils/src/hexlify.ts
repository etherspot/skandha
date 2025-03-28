import { toHex, isHex } from "viem";

/**
 * Recursively hexlify all members of an object
 * @param obj - The object to hexlify
 */
export function deepHexlify(obj: any): any {
  if (typeof obj === "function") {
    return undefined;
  }
  if (obj == null || typeof obj === "string" || typeof obj === "boolean") {
    return obj;
  }
  if (typeof obj === "bigint" || typeof obj === "number") {
    return toHex(obj).replace(/^0x0/, "0x");
  }
  if (isHex(obj)) {
    return obj;
  }
  if (Array.isArray(obj)) {
    return obj.map((member) => deepHexlify(member));
  }
  if (typeof obj === "object") {
    return Object.entries(obj).reduce(
      (acc, [key, value]) => ({ ...acc, [key]: deepHexlify(value) }),
      {}
    );
  }
  return obj;
}
