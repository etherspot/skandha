import { NetworkName } from "types/lib";
import { BigNumberish, Wallet, providers, utils } from "ethers";

export interface NetworkConfig {
  entryPoints: string[];
  relayer: string;
  beneficiary: string;
  name?: NetworkName;
  rpcEndpoint: string;
  minInclusionDenominator: number;
  throttlingSlack: number;
  banSlack: number;
  minSignerBalance: BigNumberish;
  multicall: string;
}

export type BundlerConfig = Omit<
  NetworkConfig,
  "entryPoints" | "rpcEndpoint" | "relayer" | "beneficiary"
>;

export type Networks = {
  [network in NetworkName]?: NetworkConfig;
};

export interface ConfigOptions {
  networks: Networks;
}

export class Config {
  supportedNetworks: NetworkName[];
  networks: Networks;

  constructor(private config: ConfigOptions) {
    this.supportedNetworks = this.parseSupportedNetworks();
    this.networks = this.parseNetworkConfigs();
  }

  getNetworkProvider(network: NetworkName): providers.JsonRpcProvider | null {
    const conf = this.networks[network];
    return conf ? new providers.JsonRpcProvider(conf.rpcEndpoint) : null;
  }

  getRelayer(network: NetworkName): Wallet | null {
    const config = this.getNetworkConfig(network);
    if (!config) return null;

    // fetch from env variables first
    let privKey = process.env[`SKANDHA_${network.toUpperCase()}_RELAYER`];
    if (!privKey) {
      privKey = config.relayer;
    }

    const provider = this.getNetworkProvider(network);
    if (!provider) {
      throw new Error("no provider");
    }

    if (privKey.startsWith("0x")) {
      return new Wallet(privKey, provider);
    }
    return Wallet.fromMnemonic(privKey).connect(provider);
  }

  getBeneficiary(network: NetworkName): string | null {
    const config = this.getNetworkConfig(network);
    if (!config) return null;
    return config.beneficiary;
  }

  getNetworkConfig(network: NetworkName): NetworkConfig | null {
    const config = this.networks[network];
    if (!config) {
      return null;
    }
    return config;
  }

  private parseSupportedNetworks(): NetworkName[] {
    return Object.keys(this.config.networks).map((key) => key as NetworkName);
  }

  private parseNetworkConfigs(): Networks {
    const networks: Networks = {};
    for (const key of this.supportedNetworks) {
      const network: NetworkName = key as NetworkName;
      let conf = this.config.networks[network];
      conf = Object.assign({}, bundlerDefaultConfigs, conf);
      networks[network] = {
        ...conf,
        name: network,
      };
    }
    return networks;
  }
}

const bundlerDefaultConfigs: BundlerConfig = {
  minInclusionDenominator: 10,
  throttlingSlack: 10,
  banSlack: 10,
  minSignerBalance: utils.parseEther("0.1"),
  multicall: "0xcA11bde05977b3631167028862bE2a173976CA11", // default multicall address
};
