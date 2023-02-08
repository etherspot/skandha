import {
  ReputationEntryDump,
  ReputationEntrySerialized,
  ReputationStatus
} from 'app/@types';
import { put, get, getMany, del } from 'app/lib/rocksdb-connection';
import { BigNumber, utils } from 'ethers';
import { ReputationEntry } from '../entities/ReputationEntry';
import { StakeInfo } from './UserOpValidation';

export class ReputationService {
  private REP_COLL_KEY: string; // prefix in rocksdb
  private WL_COLL_KEY: string; // whitelist prefix
  private BL_COLL_KEY: string; // blacklist prefix

  constructor(
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
    const raw = await get<
        ReputationEntrySerialized
      >(this.getKey(address)).catch(_ => null);
    let entry;
    if (!raw) {
      await this.addToCollection(address);
      entry = new ReputationEntry({
        chainId: this.chainId,
        address
      });
    } else {
      entry = new ReputationEntry({
        chainId: this.chainId,
        address,
        opsSeen: raw.opsSeen,
        opsIncluded: raw.opsIncluded,
        lastUpdateTime: raw.lastUpdateTime
      });
    }
    return entry;
  }

  async updateSeenStatus(address: string): Promise<void> {
    const entry = await this.fetchOne(address);
    entry.addToReputation(1, 0);
    await this.save(entry);
  }

  async updateIncludedStatus(address: string): Promise<void> {
    const entry = await this.fetchOne(address);
    entry.addToReputation(0, 1);
    await this.save(entry);
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
    const entry = await this.fetchOne(address);
    entry.setReputation(opsSeen, opsIncluded);
    await this.save(entry);
  }

  async dump(): Promise<ReputationEntryDump[]> {
    const addresses: string[] = await get<string[]>(
        this.REP_COLL_KEY
      ).catch(_ => []);
    const rawEntries: ReputationEntrySerialized[] = await
      getMany<ReputationEntrySerialized>(
        addresses.map(addr => this.getKey(addr))
      ).catch(_ => []);
    const entries: ReputationEntryDump[] = addresses.map(
      (address, i) => ({
        address,
        opsSeen: rawEntries[i]!.opsSeen,
        opsIncluded: rawEntries[i]!.opsIncluded
      })
    );
    return entries;
  }

  async crashedHandleOps(addr: string): Promise<void> {
    if (!addr) return;
    // todo: what value to put? how long do we want this banning to hold?
    await this.setReputation(addr, 100, 0);
  }

  async clearState(): Promise<void> {
    const addresses: string[] = await get<string[]>(
      this.REP_COLL_KEY
    ).catch(_ => []);
    for (const addr of addresses) {
      await del(this.getKey(addr));
    }
    await del(this.REP_COLL_KEY);
  }

  /**
   * Stake
   */

  /**
   * 
   * @param info StakeInfo
   * @returns null on success otherwise error
   */
  async checkStake(info: StakeInfo): Promise<string | null> {
    if (!info.addr || await this.isWhitelisted(info.addr)) {
      return null;
    }
    if (await this.getStatus(info.addr) === ReputationStatus.BANNED) {
      return `${info.addr} is banned`;
    }
    if (BigNumber.from(info.stake).lt(this.minStake)) {
      return `${info.addr} stake ${info.stake} is too low (min=${this.minStake.toString()})`;
    }
    if (BigNumber.from(info.unstakeDelaySec).lt(this.minUnstakeDelay)) {
      return `${info.addr} unstake delay ${info.unstakeDelaySec} is too low (min=${this.minUnstakeDelay})`;
    }
    return null;
  }

  /**
   * WHITELIST / BLACKLIST
   */

  async isWhitelisted(addr: string): Promise<boolean> {
    const wl = await this.fetchWhitelist();
    return wl.findIndex(w => w.toLowerCase() === addr.toLowerCase()) > -1;
  }

  async isBlacklisted(addr: string): Promise<boolean> {
    const bl = await this.fetchBlacklist();
    return bl.findIndex(w => w.toLowerCase() === addr.toLowerCase()) > -1;
  }

  async fetchWhitelist(): Promise<string[]> {
    return await get<string[]>(this.WL_COLL_KEY).catch(_ => []);
  }

  async fetchBlacklist(): Promise<string[]> {
    return await get<string[]>(this.BL_COLL_KEY).catch(_ => []);
  }

  async addToWhitelist(address: string): Promise<void> {
    const wl: string[] = await get<string[]>(this.WL_COLL_KEY).catch(_ => []);
    wl.push(address);
    await put(this.WL_COLL_KEY, wl);
  }

  async addToBlacklist(address: string): Promise<void> {
    const wl: string[] = await get<string[]>(this.BL_COLL_KEY).catch(_ => []);
    wl.push(address);
    await put(this.BL_COLL_KEY, wl);
  }

  async removefromWhitelist(address: string): Promise<void> {
    let wl: string[] = await get<string[]>(this.WL_COLL_KEY).catch(_ => []);
    wl = wl.filter(addr => (
      utils.getAddress(address) !== utils.getAddress(addr))
    );
    await put(this.WL_COLL_KEY, wl);
  }

  async removefromBlacklist(address: string): Promise<void> {
    let wl: string[] = await get<string[]>(this.BL_COLL_KEY).catch(_ => []);
    wl = wl.filter(addr => (
      utils.getAddress(address) !== utils.getAddress(addr))
    );
    await put(this.BL_COLL_KEY, wl);
  }

  /**
   * INTERNAL FUNCTIONS
   */

  private async save(entry: ReputationEntry) {
    await put(this.getKey(entry.address), entry.serialize());
  }

  private getKey(address: string): string {
    return `${this.REP_COLL_KEY}:${address}`;
  }
  
  private async addToCollection(address: string): Promise<void> {
    const addresses: string[] = await get<string[]>(
        this.REP_COLL_KEY
      ).catch(_ => []);
    addresses.push(address);
    await put(this.REP_COLL_KEY, addresses);
  }
}