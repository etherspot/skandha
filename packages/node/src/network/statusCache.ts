import { ts } from "types/lib";
import { ReqRespHandlers } from "./reqresp/handlers";
import { now } from "executor/lib/utils";

export interface StatusCache {
  get(): Promise<ts.Status>;
}

export class LocalStatusCache implements StatusCache {
  private lastUpdatedTime = 0;

  constructor(
    private reqRespHandlers: ReqRespHandlers,
    private cached: ts.Status
  ) {
    this.lastUpdatedTime = now();
  }

  async get(): Promise<ts.Status> {
    if (this.lastUpdatedTime - now() < 5000) { // 5 seconds 
      return this.cached;
    }
    try {
      for await (const statusEncoded of this.reqRespHandlers.onStatus()) {
        this.lastUpdatedTime = now();
        return this.cached = statusEncoded.data;
      }
    } catch (err) {};
    return this.cached;
  }
}
