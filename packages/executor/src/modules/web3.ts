import { SkandhaVersion } from "types/lib/executor";
import { Config } from "../config";

export class Web3 {
  constructor(private config: Config, private version: SkandhaVersion) {}

  clientVersion(): string {
    return `skandha/${this.version.version}-${this.version.commit}`;
  }
}
