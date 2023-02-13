export class Web3 {
  clientVersion(): string {
    return require('app/../package.json').version;
  }
}
