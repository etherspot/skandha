import { SlotMap, StorageMap } from "../interfaces";

// REF: https://github.com/eth-infinitism/bundler/blob/ba29f67567410787d8ccb4828fa5abb65118010e/packages/bundler/src/modules/moduleUtils.ts#L20-L50
/**
/ * merge all validationStorageMap objects into merged map
 * - entry with "root" (string) is always preferred over entry with slot-map
 * - merge slot entries
 * NOTE: slot values are supposed to be the value before the transaction started.
 *  so same address/slot in different validations should carry the same value
 * @param mergedStorageMap
 * @param validationStorageMap
 */
export function mergeStorageMap(
  mergedStorageMap: StorageMap,
  validationStorageMap: StorageMap
): StorageMap {
  Object.entries(validationStorageMap).forEach(([addr, validationEntry]) => {
    if (typeof validationEntry === "string") {
      // it's a root. override specific slots, if any
      mergedStorageMap[addr] = validationEntry;
    } else if (typeof mergedStorageMap[addr] === "string") {
      // merged address already contains a root. ignore specific slot values
    } else {
      let slots: SlotMap;
      if (mergedStorageMap[addr] == null) {
        slots = mergedStorageMap[addr] = {};
      } else {
        slots = mergedStorageMap[addr] as SlotMap;
      }

      Object.entries(validationEntry).forEach(([slot, val]) => {
        slots[slot] = val;
      });
    }
  });
  return mergedStorageMap;
}
