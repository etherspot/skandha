import { IMempoolEntry } from "../../entities/interfaces.js";
import { MempoolEntry } from "../../entities/MempoolEntry.js";

export function rawEntryToMempoolEntry(raw: IMempoolEntry): MempoolEntry {
  return new MempoolEntry(raw);
}
