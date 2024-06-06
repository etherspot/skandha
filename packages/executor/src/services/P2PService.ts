import { UserOperationStruct } from "@skandha/types/lib/contracts/EPv6/EntryPoint";
import { MempoolService } from "./MempoolService";
import { EntryPointService } from "./EntryPointService";
import { EntryPointVersion } from "./EntryPointService/interfaces";

export type PooledUserOpHashesResponse = {
  next_cursor: number;
  hashes: string[];
};

export type PooledUseropsByHashResponse = UserOperationStruct[];

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

  async getPooledUserOpsByHash(
    hashes: string[]
  ): Promise<UserOperationStruct[]> {
    const userOps = [];
    for (const hash of hashes) {
      const entry = await this.mempoolService.getEntryByHash(hash);
      if (
        entry &&
        this.entryPointService.getEntryPointVersion(entry.entryPoint) ===
          EntryPointVersion.SIX
      ) {
        userOps.push(entry.userOp as UserOperationStruct);
      }
    }
    return userOps;
  }

  async userOpByHash(hash: string): Promise<UserOperationStruct | null> {
    const entry = await this.mempoolService.getEntryByHash(hash);
    if (
      entry &&
      this.entryPointService.getEntryPointVersion(entry.entryPoint) ===
        EntryPointVersion.SIX
    ) {
      return entry.userOp as UserOperationStruct;
    }
    return null;
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
