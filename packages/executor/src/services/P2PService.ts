import { UserOperation } from "@skandha/types/lib/contracts/UserOperation";
import { MempoolService } from "./MempoolService";
import { EntryPointService } from "./EntryPointService";
import { EntryPointVersion } from "./EntryPointService/interfaces";

export type PooledUserOpHashesResponse = {
  next_cursor: number;
  hashes: string[];
};

export type PooledUseropsByHashResponse = UserOperation[];

export class P2PService {
  constructor(
    private entryPointService: EntryPointService,
    private mempoolService: MempoolService
  ) {}

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

  async getPooledUserOpsByHash(hashes: string[]): Promise<UserOperation[]> {
    const userOps = [];
    for (const hash of hashes) {
      const entry = await this.mempoolService.getEntryByHash(hash);
      if (
        entry &&
        this.entryPointService.getEntryPointVersion(entry.entryPoint) ===
          EntryPointVersion.SEVEN
      ) {
        userOps.push(entry.userOp as UserOperation);
      }
    }
    return userOps;
  }

  async userOpByHash(hash: string): Promise<UserOperation | null> {
    const entry = await this.mempoolService.getEntryByHash(hash);
    if (
      entry &&
      this.entryPointService.getEntryPointVersion(entry.entryPoint) ===
        EntryPointVersion.SEVEN
    ) {
      return entry.userOp as UserOperation;
    }
    return null;
  }

  async isNewOrReplacingUserOp(
    userOp: UserOperation,
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
