import { Mutex } from "async-mutex";
import { BigNumber, utils } from "ethers";
import { IDbController } from "types/lib";
import * as RpcErrorCodes from "types/lib/api/errors/rpc-error-codes";
import { ReputationStatus } from "types/lib/executor";
import { ReputationEntry } from "../entities/ReputationEntry";
import {
  ReputationEntryDump,
  ReputationEntrySerialized,
} from "../entities/interfaces";
import { StakeInfo } from "../interfaces";

export class ReputationService {
  private REP_COLL_KEY: string; // prefix in rocksdb
  private WL_COLL_KEY: string; // whitelist prefix
  private BL_COLL_KEY: string; // blacklist prefix
  private mutex = new Mutex();

  constructor(
    private db: IDbController,
    private chainId: number,
    private minInclusionDenominator: number,
    private throttlingSlack: number,
    private banSlack: number,
    private readonly minStake: BigNumber,
    private readonly minUnstakeDelay: number
  ) {
    this.REP_COLL_KEY = `${chainId}:REPUTATION`;
    this.WL_COLL_KEY = `${this.REP_COLL_KEY}:WL`;
    this.BL_COLL_KEY = `${this.REP_COLL_KEY}:BL`;
  }

  /**
   * PUBLIC INTERFACE
   */

  async fetchOne(address: string): Promise<ReputationEntry> {
    const raw = await this.db
      .get<ReputationEntrySerialized>(this.getKey(address))
      .catch(() => null);
    let entry;
    if (!raw) {
      await this.addToCollection(address);
      entry = new ReputationEntry({
        chainId: this.chainId,
        address,
      });
      await this.save(entry);
    } else {
      entry = new ReputationEntry({
        chainId: this.chainId,
        address,
        opsSeen: raw.opsSeen,
        opsIncluded: raw.opsIncluded,
        lastUpdateTime: raw.lastUpdateTime,
      });
    }
    return entry;
  }

  async updateSeenStatus(address: string): Promise<void> {
    await this.mutex.runExclusive(async () => {
      const entry = await this.fetchOne(address);
      entry.addToReputation(1, 0);
      await this.save(entry);
    });
  }

  async updateIncludedStatus(address: string): Promise<void> {
    await this.mutex.runExclusive(async () => {
      const entry = await this.fetchOne(address);
      entry.addToReputation(0, 1);
      await this.save(entry);
    });
  }

  async getStatus(address: string): Promise<ReputationStatus> {
    const entry = await this.fetchOne(address);
    return entry.getStatus(
      this.minInclusionDenominator,
      this.throttlingSlack,
      this.banSlack
    );
  }

  async setReputation(
    address: string,
    opsSeen: number,
    opsIncluded: number
  ): Promise<void> {
    await this.mutex.runExclusive(async () => {
      const entry = await this.fetchOne(address);
      entry.setReputation(opsSeen, opsIncluded);
      await this.save(entry);
    });
  }

  async dump(): Promise<ReputationEntryDump[]> {
    const addresses: string[] = await this.db
      .get<string[]>(this.REP_COLL_KEY)
      .catch(() => []);
    const rawEntries: ReputationEntrySerialized[] = await this.db
      .getMany<ReputationEntrySerialized>(
        addresses.map((addr) => this.getKey(addr))
      )
      .catch(() => []);
    const entries = addresses
      .map(
        (address, i) =>
          new ReputationEntry({
            chainId: this.chainId,
            address,
            opsSeen: rawEntries[i] != null ? rawEntries[i].opsSeen : 0,
            opsIncluded: rawEntries[i] != null ? rawEntries[i].opsIncluded : 0,
          })
      )
      .map((entry) => ({
        address: entry.address,
        opsSeen: entry.opsSeen,
        opsIncluded: entry.opsIncluded,
        status: entry.getStatus(
          this.minInclusionDenominator,
          this.throttlingSlack,
          this.banSlack
        ),
      }));
    return entries;
  }

  async crashedHandleOps(addr: string): Promise<void> {
    if (!addr) return;
    // todo: what value to put? how long do we want this banning to hold?
    await this.setReputation(addr, 100, 0);
  }

  async clearState(): Promise<void> {
    await this.mutex.runExclusive(async () => {
      const addresses: string[] = await this.db
        .get<string[]>(this.REP_COLL_KEY)
        .catch(() => []);
      for (const addr of addresses) {
        await this.db.del(this.getKey(addr));
      }
      await this.db.del(this.REP_COLL_KEY);
    });
  }

  /**
   * Stake
   */

  /**
   *
   * @param info StakeInfo
   * @returns null on success otherwise error
   */
  async checkStake(
    info: StakeInfo | undefined
  ): Promise<{ msg: string; code: number }> {
    if (!info || !info.addr || (await this.isWhitelisted(info.addr))) {
      return { msg: "", code: 0 };
    }
    if ((await this.getStatus(info.addr)) === ReputationStatus.BANNED) {
      return {
        msg: `${info.addr} is banned`,
        code: RpcErrorCodes.PAYMASTER_OR_AGGREGATOR_BANNED,
      };
    }
    if (BigNumber.from(info.stake).lt(this.minStake)) {
      if (info.stake == 0) {
        return {
          msg: `${info.addr} is unstaked`,
          code: RpcErrorCodes.STAKE_DELAY_TOO_LOW,
        };
      }
      return {
        msg: `${info.addr} stake ${
          info.stake
        } is too low (min=${this.minStake.toString()})`,
        code: RpcErrorCodes.STAKE_DELAY_TOO_LOW,
      };
    }
    if (BigNumber.from(info.unstakeDelaySec).lt(this.minUnstakeDelay)) {
      return {
        msg: `${info.addr} unstake delay ${info.unstakeDelaySec} is too low (min=${this.minUnstakeDelay})`,
        code: RpcErrorCodes.STAKE_DELAY_TOO_LOW,
      };
    }
    return { msg: "", code: 0 };
  }

  /**
   * @param entry - a non-sender unstaked entry.
   * @returns maxMempoolCount - the number of UserOperations this entity is allowed to have in the mempool.
   */
  calculateMaxAllowedMempoolOpsUnstaked(entry: ReputationEntry | null): number {
    const SAME_UNSTAKED_ENTITY_MEMPOOL_COUNT = 10;
    if (entry == null) {
      return SAME_UNSTAKED_ENTITY_MEMPOOL_COUNT;
    }
    const INCLUSION_RATE_FACTOR = 10;
    let inclusionRate = entry.opsIncluded / entry.opsSeen;
    if (entry.opsSeen === 0) {
      // prevent NaN of Infinity in tests
      inclusionRate = 0;
    }
    return (
      SAME_UNSTAKED_ENTITY_MEMPOOL_COUNT +
      Math.floor(inclusionRate * INCLUSION_RATE_FACTOR) +
      Math.min(entry.opsIncluded, 10000)
    );
  }

  /**
   * WHITELIST / BLACKLIST
   */

  async isWhitelisted(addr: string): Promise<boolean> {
    const wl = await this.fetchWhitelist();
    return wl.findIndex((w) => w.toLowerCase() === addr.toLowerCase()) > -1;
  }

  async isBlacklisted(addr: string): Promise<boolean> {
    const bl = await this.fetchBlacklist();
    return bl.findIndex((w) => w.toLowerCase() === addr.toLowerCase()) > -1;
  }

  async fetchWhitelist(): Promise<string[]> {
    return await this.db.get<string[]>(this.WL_COLL_KEY).catch(() => []);
  }

  async fetchBlacklist(): Promise<string[]> {
    return await this.db.get<string[]>(this.BL_COLL_KEY).catch(() => []);
  }

  async addToWhitelist(address: string): Promise<void> {
    const wl: string[] = await this.db
      .get<string[]>(this.WL_COLL_KEY)
      .catch(() => []);
    wl.push(address);
    await this.db.put(this.WL_COLL_KEY, wl);
  }

  async addToBlacklist(address: string): Promise<void> {
    const wl: string[] = await this.db
      .get<string[]>(this.BL_COLL_KEY)
      .catch(() => []);
    wl.push(address);
    await this.db.put(this.BL_COLL_KEY, wl);
  }

  async removefromWhitelist(address: string): Promise<void> {
    let wl: string[] = await this.db
      .get<string[]>(this.WL_COLL_KEY)
      .catch(() => []);
    wl = wl.filter(
      (addr) => utils.getAddress(address) !== utils.getAddress(addr)
    );
    await this.db.put(this.WL_COLL_KEY, wl);
  }

  async removefromBlacklist(address: string): Promise<void> {
    let wl: string[] = await this.db
      .get<string[]>(this.BL_COLL_KEY)
      .catch((_: any) => []);
    wl = wl.filter(
      (addr) => utils.getAddress(address) !== utils.getAddress(addr)
    );
    await this.db.put(this.BL_COLL_KEY, wl);
  }

  /**
   * INTERNAL FUNCTIONS
   */

  private async save(entry: ReputationEntry): Promise<void> {
    await this.db.put(this.getKey(entry.address), entry.serialize());
  }

  private getKey(address: string): string {
    return `${this.REP_COLL_KEY}:${address.toLowerCase()}`;
  }

  private async addToCollection(address: string): Promise<void> {
    const addresses: string[] = await this.db
      .get<string[]>(this.REP_COLL_KEY)
      .catch(() => []);
    addresses.push(address);
    await this.db.put(this.REP_COLL_KEY, addresses);
  }
}
