import { hexlify } from "ethers/lib/utils";

/**
 * hexlify all members of object, recursively
 * @param obj
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function hexlifyUserOp(obj: any): any {
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
    return obj.map((member) => hexlifyUserOp(member));
  }
  return Object.keys(obj).reduce((set, key) => {
    const value = hexlifyUserOp(obj[key]);
    return {
      ...set,
      [key]: value != null ? value : undefined,
    };
  }, {});
}
