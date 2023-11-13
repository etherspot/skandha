import { providers } from "ethers";
import { UserOperationStruct } from "types/lib/executor/contracts/EntryPoint";
import { Logger } from "types/lib";
import { Config } from "../config";
import { BundlingService } from "./BundlingService";
import { MempoolService } from "./MempoolService";

export type PooledUserOpHashesResponse = {
  more_flag: boolean;
  hashes: string[];
};

export type PooledUseropsByHashResponse = UserOperationStruct[];

export class P2PService {
  constructor(
    private provider: providers.JsonRpcProvider,
    private mempoolService: MempoolService,
    private bundlingService: BundlingService,
    private config: Config,
    private logger: Logger
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
