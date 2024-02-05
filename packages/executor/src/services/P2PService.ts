import { UserOperationStruct } from "types/lib/contracts/EPv6/EntryPoint";
import { MempoolService } from "./MempoolService";
import { EntryPointService } from "./EntryPointService";
import { EntryPointVersion } from "./EntryPointService/interfaces";

export type PooledUserOpHashesResponse = {
  more_flag: boolean;
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
    let more_flag = false;
    let keys = await this.mempoolService.fetchKeys();
    if (keys.length > limit + offset) {
      more_flag = true;
    }
    keys = keys.slice(offset, offset + limit);

    const mempoolEntries = await this.mempoolService.fetchManyByKeys(keys);
    return {
      more_flag,
      hashes: mempoolEntries
        .filter(
          (entry) =>
            this.entryPointService.getEntryPointVersion(entry.entryPoint) ===
            EntryPointVersion.SIX
        )
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
