import { NetworkNames } from 'etherspot';

export interface RelayerConfigOptions {
  privateKey?: string
  rpcEndpoint?: string
  beneficiary?: string
  entryPoint?: string
  minInclusionDenominator: number,
  throttlingSlack: number,
  banSlack: number
};

export interface ConfigOptions {
  supportedNetworks?: NetworkNames[]
  relayers?: RelayerConfigOptions[]
};

export type Relayers = Map<NetworkNames, RelayerConfigOptions>;

export class Config {
  public static readonly CHAIN_DEFAULT = NetworkNames.Goerli;

  public supportedNetworks: NetworkNames[];

  public relayers: Relayers;

  constructor(options: ConfigOptions = {}) {
    this.supportedNetworks = this.parseSupportedNetworks();
    this.relayers = this.getRelayers();
  }

  private parseSupportedNetworks(): NetworkNames[] {
    if (!process.env.SUPPORTED_NETWORKS) {
      return [];
    }
    try {
      const networks: string[] = JSON.parse(process.env.SUPPORTED_NETWORKS)
        .map((key: string) => this.parseConfigValue(key));
      return networks.filter(network => {
        return (network.charAt(0).toUpperCase() + network.slice(1)) in NetworkNames;
      }) as NetworkNames[];
    } catch (err) {
      console.error('Invalid SUPPORTED_NETWORKS');
      throw err;
    }
  }

  private getRelayers(): Map<NetworkNames, RelayerConfigOptions> {
    const supportedNetworks = this.supportedNetworks;
    const relayersConfig: RelayerConfigOptions[] = supportedNetworks
      .map(key => this.keyToConfigValue(key))
      .map(network => {
        return this.getRelayerConfigOrDefault(network);
      });
    return supportedNetworks.reduce((map, network, i) => {
      map.set(network, relayersConfig[i]);
      return map;
    }, new Map());
  }

  // BSC_TEST -> bscTest
  private parseConfigValue(value: string) {
    return value
      .toLowerCase()
      .replace(/_[a-z]/g, found => `${found && found[1]!.toUpperCase()}`);
  }

  // bscTest -> BSC_TEST
  private keyToConfigValue(key: string) {
    return key
      .replace(/([A-Z])/g, found => `-${found}`)
      .replace(/-/g, '_')
      .toUpperCase();
  }

  private getRelayerConfigOrDefault(network: string): RelayerConfigOptions {
    const fallback = bundlerDefaultConfigs.relayers;
    const privateKey = process.env[`${network}_PRIVATE_KEY`];
    const rpcEndpoint = process.env[`${network}_RPC`];
    const beneficiary = process.env[`${network}_ENTRY_POINT`];
    const entryPoint = process.env[`${network}_BENEFICIARY`];
    let minInclusionDenominator = Number(process.env[`${network}_INCLUSION_DENOMINATOR`]);
    let throttlingSlack = Number(process.env[`${network}_THROTTLING_SLACK`]);
    let banSlack = Number(process.env[`${network}_BAN_SLACK`]);
    if (!minInclusionDenominator) {
      minInclusionDenominator = fallback.minInclusionDenominator;
    }
    if (!throttlingSlack) {
      throttlingSlack = fallback.throttlingSlack;
    }
    if (!banSlack) {
      banSlack = fallback.banSlack;
    }

    return {
      privateKey,
      rpcEndpoint,
      beneficiary,
      entryPoint,
      minInclusionDenominator,
      throttlingSlack,
      banSlack
    } as RelayerConfigOptions;

  }
};

const bundlerDefaultConfigs = {
  relayers: {
    minInclusionDenominator: 10,
    throttlingSlack: 10,
    banSlack: 10
  }
};

const nonBundlerDefaultConfigs = {
  relayers: {
    minInclusionDenominator: 100,
    throttlingSlack: 10,
    banSlack: 10
  }
};

export default new Config();
