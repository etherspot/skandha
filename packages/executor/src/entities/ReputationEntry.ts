import { ReputationStatus } from "types/lib/executor";
import { now } from "../utils";
import { IReputationEntry, ReputationEntrySerialized } from "./interfaces";

export class ReputationEntry implements IReputationEntry {
  chainId: number;
  address: string;
  lastUpdateTime: number;
  private _opsSeen: number;
  private _opsIncluded: number;

  constructor({
    chainId,
    address,
    opsSeen = 0,
    opsIncluded = 0,
    lastUpdateTime = 0,
  }: {
    chainId: number;
    address: string;
    opsSeen?: number;
    opsIncluded?: number;
    lastUpdateTime?: number;
  }) {
    this.chainId = chainId;
    this.address = address;
    this._opsSeen = opsSeen;
    this._opsIncluded = opsIncluded;
    if (!lastUpdateTime) {
      lastUpdateTime = now();
    }
    this.lastUpdateTime = lastUpdateTime;
  }

  get opsSeen(): number {
    const elapsedHours = Math.floor((now() - this.lastUpdateTime) / 3600);
    const newRep = Math.floor(this._opsSeen * (1 - elapsedHours * (1 / 24)));
    return Math.max(newRep, 0);
  }

  get opsIncluded(): number {
    const elapsedHours = Math.floor((now() - this.lastUpdateTime) / 3600);
    const newRep = Math.floor(
      this._opsIncluded * (1 - elapsedHours * (1 / 24))
    );
    return Math.max(newRep, 0);
  }

  isBanned(minInclusionDenominator: number, banSlack: number): boolean {
    const minExpectedIncluded = Math.floor(
      this.opsSeen / minInclusionDenominator
    );
    return minExpectedIncluded > this.opsIncluded + banSlack;
  }

  isThrottled(
    minInclusionDenominator: number,
    throttlingSlack: number
  ): boolean {
    const minExpectedIncluded = Math.floor(
      this.opsSeen / minInclusionDenominator
    );
    return minExpectedIncluded > this.opsIncluded + throttlingSlack;
  }

  getStatus(
    minInclusionDenominator: number,
    throttlingSlack: number,
    banSlack: number
  ): ReputationStatus {
    if (this.isBanned(minInclusionDenominator, banSlack)) {
      return ReputationStatus.BANNED;
    }
    if (this.isThrottled(minInclusionDenominator, throttlingSlack)) {
      return ReputationStatus.THROTTLED;
    }
    return ReputationStatus.OK;
  }

  addToReputation(opsSeen: number, opsIncluded: number): void {
    this._opsSeen = this.opsSeen + opsSeen;
    this._opsIncluded = this.opsIncluded + opsIncluded;
    this.lastUpdateTime = now();
  }

  setReputation(opsSeen: number, opsIncluded: number): void {
    this._opsSeen = opsSeen;
    this._opsIncluded = opsIncluded;
    this.lastUpdateTime = now();
  }

  serialize(): ReputationEntrySerialized {
    return {
      opsSeen: this._opsSeen,
      opsIncluded: this._opsIncluded,
      lastUpdateTime: this.lastUpdateTime,
    };
  }
}
