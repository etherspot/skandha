import { IMempoolEntry } from "../../entities/interfaces";
import { MempoolEntry } from "../../entities/MempoolEntry";

export function rawEntryToMempoolEntry(raw: IMempoolEntry): MempoolEntry {
  return new MempoolEntry({
    ...raw
  });
}
