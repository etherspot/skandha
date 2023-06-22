import { providers } from "ethers";
import { EntryPoint__factory } from "types/lib/executor/contracts";
import { UserOperationStruct } from "types/lib/executor/contracts/EntryPoint";
import { Logger } from "../interfaces";
import { Config } from "../config";
import { MempoolEntry } from "../entities/MempoolEntry";
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
    const entryPointToUserOps: {
      [key: string]: MempoolEntry[] | null;
    } = {}; // mapping (entry point address => userOp[])

    for (const entry of mempoolEntries) {
      const { entryPoint } = entry;
      if (entryPointToUserOps[entryPoint] == null) {
        entryPointToUserOps[entryPoint] = [];
      }
      entryPointToUserOps[entryPoint]?.push(entry);
    }

    let userOpHashes: string[] = [];

    for (const entryPoint of Object.keys(entryPointToUserOps)) {
      const entries = entryPointToUserOps[entryPoint];
      const entryPointContract = EntryPoint__factory.connect(
        entryPoint,
        this.provider
      );
      const hashes = await this.bundlingService.getUserOpHashes(
        entryPointContract,
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        entries!
      );
      userOpHashes = userOpHashes.concat(hashes);
    }

    return {
      more_flag,
      hashes: userOpHashes,
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
}
