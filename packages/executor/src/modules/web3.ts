import { Config } from "../config";
import { getVersionData } from "cli/lib/util/version";
export class Web3 {
  constructor(private config: Config) {}

  clientVersion(): string {
    const {version, commit} = getVersionData();
    return `skandha/${this.config.unsafeMode ? "unsafe/" : ""}${version}-${commit}`;
  }
}
