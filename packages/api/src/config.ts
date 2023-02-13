import { NetworkNames } from 'etherspot';
import { Wallet, providers } from 'ethers';
import config from '../config.json';

export interface NetworkConfig {
  entryPoints: {
    [address: string]: EntryPointConfig
  }
  rpcEndpoint: string,
  minInclusionDenominator: number,
  throttlingSlack: number,
  banSlack: number
}

export interface EntryPointConfig {
  relayer: string,
  beneficiary: string
}

export interface ServerConfig {
  mode: string;
  port: number;
}

export type Networks = Map<NetworkNames, NetworkConfig>;

export interface ConfigOptions {
  server: { // express options
    mode: string,
    port: number
  }
  rocksdb: string, // rocksdb path
  networks: NetworkConfig[], // per network configuration
  mempool: { // mempool namespaces (WIP)
    default: string
  }
}

export class Config {
  public static readonly CHAIN_DEFAULT = NetworkNames.Goerli;
  public supportedNetworks: NetworkNames[];
  public networks: Networks;
  public rocksdb: string;
  public server: ServerConfig;

  constructor() {
    this.supportedNetworks = this.parseSupportedNetworks();
    this.networks = this.parseNetworkConfigs();
    this.rocksdb = config.rocksdb || 'db';
    this.server = Object.assign({}, defaultServiceConfigs, config.server);
  }

  getNetworkProvider(network: NetworkNames): providers.JsonRpcProvider | null {
    const conf = this.networks.get(network);
    return conf ?
      new providers.JsonRpcProvider(conf.rpcEndpoint) :
      null;
  }

  getEntryPointRelayer(network: NetworkNames, address: string): Wallet | null {
    const conf = this.getEntryPointConfig(network, address);
    if (conf) {
      const provider = this.getNetworkProvider(network);
      return new Wallet(conf.relayer, provider!);
    }
    return null;
  }

  getEntryBeneficiary(network: NetworkNames, address: string): string | null {
    const conf = this.getEntryPointConfig(network, address);
    return conf ? conf.beneficiary : null;
  }

  getEntryPointConfig(network: NetworkNames, address: string): EntryPointConfig | null {
    const provider = this.getNetworkProvider(network);
    if (provider) {
      const conf = this.networks.get(network);
      if (conf) {
        const entryPoint = conf.entryPoints[address];
        if (entryPoint) {
          return entryPoint;
        }
      }
    }
    return null;
  }

  private parseSupportedNetworks(): NetworkNames[] {
    return Object.keys(config.networks)
      .map(key => this.toNetworkNames(key));
  }

  private parseNetworkConfigs(): Networks {
    const networks: Networks = new Map();
    for (const key of Object.keys(config.networks)) {
      const network: NetworkNames = this.toNetworkNames(key);
      let conf = config.networks[key as keyof typeof config.networks];
      conf = Object.assign({}, bundlerDefaultConfigs, conf);
      networks.set(network, conf);
    }
    return networks;
  }

  private toNetworkNames(key: string): NetworkNames {
    const networkName = Object.values(NetworkNames)
      .find(value => value.toLowerCase() === key.toLowerCase());
    if (!networkName) {
      throw new Error('Invalid network');
    }
    return networkName as NetworkNames;
  }
};

const defaultServiceConfigs = {
  mode: 'development',
  port: 3000
};

const bundlerDefaultConfigs = {
  network: {
    minInclusionDenominator: 10,
    throttlingSlack: 10,
    banSlack: 10
  }
};

const nonBundlerDefaultConfigs = {
  network: {
    minInclusionDenominator: 100,
    throttlingSlack: 10,
    banSlack: 10
  }
};

export default new Config();
