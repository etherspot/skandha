import { IMempoolEntry } from "../../entities/interfaces";
import { MempoolEntry } from "../../entities/MempoolEntry";

export function rawEntryToMempoolEntry(raw: IMempoolEntry): MempoolEntry {
  return new MempoolEntry({
    chainId: raw.chainId,
    userOp: raw.userOp,
    entryPoint: raw.entryPoint,
    prefund: raw.prefund,
    aggregator: raw.aggregator,
    factory: raw.factory,
    paymaster: raw.paymaster,
    hash: raw.hash,
    userOpHash: raw.userOpHash,
    lastUpdatedTime: raw.lastUpdatedTime,
    transaction: raw.transaction,
    status: raw.status,
    submitAttempts: raw.submitAttempts,
    submittedTime: raw.submittedTime,
  });
}
