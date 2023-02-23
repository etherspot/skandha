export class Web3 {
  clientVersion(): string {
    // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
    return require("../package.json").version;
  }
}
