import { hexlify } from "ethers/lib/utils";

/**
 * hexlify all members of object, recursively
 * @param obj
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function deepHexlify(obj: any): any {
  if (typeof obj === "function") {
    return undefined;
  }
  if (obj == null || typeof obj === "string" || typeof obj === "boolean") {
    return obj;
    // eslint-disable-next-line no-underscore-dangle
  } else if (obj._isBigNumber != null || typeof obj !== "object") {
    return hexlify(obj).replace(/^0x0/, "0x");
  }
  if (Array.isArray(obj)) {
    return obj.map((member) => deepHexlify(member));
  }
  return Object.keys(obj).reduce(
    (set, key) => ({
      ...set,
      [key]: deepHexlify(obj[key]),
    }),
    {}
  );
}
