import { Config } from "../config";
export class Web3 {
  constructor(private config: Config) {}

  clientVersion(): string {
    return `skandha/${this.config.unsafeMode ? "unsafe/" : ""}0.0.1`; // TODO: get version based on commit hash
  }
}
