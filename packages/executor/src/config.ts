// TODO: create a new package "config" instead of this file
import { CHAIN_ID_TO_NETWORK_NAME, NetworkName } from "types/lib";
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
  testingMode?: boolean;
  unsafeMode: boolean;
}

export class Config {
  supportedNetworks: NetworkName[];
  networks: Networks;
  testingMode: boolean;
  unsafeMode: boolean;

  constructor(private config: ConfigOptions) {
    this.supportedNetworks = this.parseSupportedNetworks();
    this.networks = this.parseNetworkConfigs();
    this.testingMode = config.testingMode ?? false;
    this.unsafeMode = config.unsafeMode ?? false;
  }

  getNetworkProvider(network: NetworkName): providers.JsonRpcProvider | null {
    const conf = this.networks[network];
    let endpoint = RPC_ENDPOINT_ENV(network);
    if (!endpoint) {
      endpoint = conf?.rpcEndpoint;
    }
    return endpoint ? new providers.JsonRpcProvider(endpoint) : null;
  }

  getRelayer(network: NetworkName): Wallet | providers.JsonRpcSigner | null {
    const config = this.getNetworkConfig(network);
    if (!config) return null;

    // fetch from env variables first
    let privKey = RELAYER_ENV(network);
    if (!privKey) {
      privKey = config.relayer;
    }

    const provider = this.getNetworkProvider(network);
    if (!provider) {
      throw new Error("no provider");
    }

    if (this.testingMode) {
      return provider.getSigner();
    }

    if (privKey.startsWith("0x")) {
      return new Wallet(privKey, provider);
    }

    return Wallet.fromMnemonic(privKey).connect(provider);
  }

  getBeneficiary(network: NetworkName): string | null {
    const beneficiary = BENEFICIARY_ENV(network);
    if (beneficiary) return beneficiary;

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

  isNetworkSupported(network: NetworkName | number): boolean {
    if (typeof network === "number") {
      const networkName = CHAIN_ID_TO_NETWORK_NAME[network] as NetworkName;
      if (!networkName) return false;
      return this.isNetworkSupported(networkName);
    }
    return this.supportedNetworks.some((name) => name === network);
  }

  isEntryPointSupported(
    network: NetworkName | number,
    entryPoint: string
  ): boolean {
    if (typeof network === "number") {
      const networkName = CHAIN_ID_TO_NETWORK_NAME[network] as NetworkName;
      if (!networkName) return false;
      return this.isEntryPointSupported(networkName, entryPoint);
    }
    const config = this.getNetworkConfig(network);
    return !!config?.entryPoints.some(
      (addr) => addr.toLowerCase() === entryPoint.toLowerCase()
    );
  }

  private parseSupportedNetworks(): NetworkName[] {
    const envNetworks = NETWORKS_ENV();
    if (envNetworks) {
      return envNetworks.map((key) => key as NetworkName);
    }
    return Object.keys(this.config.networks).map((key) => key as NetworkName);
  }

  private parseNetworkConfigs(): Networks {
    const networks: Networks = {};
    for (const key of this.supportedNetworks) {
      const network: NetworkName = key as NetworkName;
      const entryPoints = ENTRYPOINTS_ENV(network);
      let conf = this.config.networks[network];
      conf = Object.assign(
        {
          entryPoints,
        },
        bundlerDefaultConfigs,
        conf
      );
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

const RELAYER_ENV = (network: NetworkName): string | undefined =>
  process.env[`SKANDHA_${network.toUpperCase()}_RELAYER`];
const RPC_ENDPOINT_ENV = (network: NetworkName): string | undefined =>
  process.env[`SKANDHA_${network.toUpperCase()}_RPC`];
const BENEFICIARY_ENV = (network: NetworkName): string | undefined =>
  process.env[`SKANDHA_${network.toUpperCase()}_BENEFICIARY`];
const NETWORKS_ENV = (): string[] | undefined => {
  const networks = process.env["SKANDHA_NETWORKS"];
  if (networks) {
    return networks.toLowerCase().replace(/ /g, "").split(",");
  }
  return undefined;
};
const ENTRYPOINTS_ENV = (network: NetworkName): string[] | undefined => {
  const entryPoints =
    process.env[`SKANDHA_${network.toUpperCase()}_ENTRYPOINTS`];
  if (entryPoints) {
    return entryPoints.toLowerCase().replace(/ /g, "").split(",");
  }
  return undefined;
};
