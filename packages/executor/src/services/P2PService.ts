import { UserOperationStruct } from "types/lib/executor/contracts/EntryPoint";
import { MempoolService } from "./MempoolService";

export type PooledUserOpHashesResponse = {
  next_cursor: number;
  hashes: string[];
};

export type PooledUseropsByHashResponse = UserOperationStruct[];

export class P2PService {
  constructor(private mempoolService: MempoolService) {}

  async getPooledUserOpHashes(
    limit: number,
    offset: number
  ): Promise<PooledUserOpHashesResponse> {
    const entries = await this.mempoolService.getNewEntriesSorted(
      limit,
      offset
    );
    const hasMore = entries.length == limit;
    return {
      next_cursor: hasMore ? entries.length + offset : 0,
      hashes: entries
        .map((entry) => entry.userOpHash)
        .filter((hash) => hash && hash.length === 66),
    };
  }

  async getPooledUserOpsByHash(
    hashes: string[]
  ): Promise<UserOperationStruct[]> {
    const userOps = [];
    for (const hash of hashes) {
      const entry = await this.mempoolService.getEntryByHash(hash);
      if (entry) {
        userOps.push(entry.userOp);
      }
    }
    return userOps;
  }

  async userOpByHash(hash: string): Promise<UserOperationStruct | null> {
    const entry = await this.mempoolService.getEntryByHash(hash);
    return entry ? entry.userOp : null;
  }

  async isNewOrReplacingUserOp(
    userOp: UserOperationStruct,
    entryPoint: string
  ): Promise<boolean> {
    try {
      return await this.mempoolService.validateUserOpReplaceability(
        userOp,
        entryPoint
      );
    } catch (err) {
      return false;
    }
  }
}
