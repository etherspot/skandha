// TODO: create a new package "config" instead of this file and refactor
import { Wallet, providers, utils } from "ethers";
import { NetworkName } from "types/lib";
import {
  BundlerConfig,
  ConfigOptions,
  NetworkConfig,
  Networks,
} from "./interfaces";

export class Config {
  supportedNetworks: {
    [networkName in NetworkName]: number;
  };
  networks: Networks;
  testingMode: boolean;
  unsafeMode: boolean;
  redirectRpc: boolean;

  constructor(private config: ConfigOptions) {
    this.testingMode = config.testingMode ?? false;
    this.unsafeMode = config.unsafeMode ?? false;
    this.redirectRpc = config.redirectRpc ?? false;
    this.supportedNetworks = this.parseSupportedNetworks();
    this.networks = this.parseNetworkConfigs();
  }

  static async init(configOptions: ConfigOptions): Promise<Config> {
    const config = new Config(configOptions);
    await config.fetchChainIds();
    return config;
  }

  getNetworkProvider(network: string): providers.JsonRpcProvider | null {
    const conf = this.networks[network];
    const endpoint = conf?.rpcEndpoint;
    return endpoint ? new providers.JsonRpcProvider(endpoint) : null;
  }

  getRelayer(network: string): Wallet | providers.JsonRpcSigner | null {
    const config = this.getNetworkConfig(network);
    if (!config) return null;

    // fetch from env variables first
    const privKey = config.relayer;
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

  getBeneficiary(network: string): string | null {
    const config = this.getNetworkConfig(network);
    if (!config) return null;
    return config.beneficiary;
  }

  getNetworkConfig(network: string): NetworkConfig | null {
    const config = this.networks[network];
    if (!config) {
      return null;
    }
    return config;
  }

  async fetchChainIds(): Promise<void> {
    for (const networkName of Object.keys(this.supportedNetworks)) {
      const provider = this.getNetworkProvider(networkName);
      if (!provider) {
        throw new Error(`No provider for ${networkName}`);
      }
      try {
        const network = await provider.getNetwork();
        this.supportedNetworks[networkName] = network.chainId;
      } catch (err) {
        throw new Error(`Could not fetch chain id for ${networkName}`);
      }
    }
  }

  isNetworkSupported(network: NetworkName | number): boolean {
    if (typeof network === "number") {
      return Object.values(this.supportedNetworks).some(
        (chainId) => chainId === network
      );
    }
    return Object.keys(this.supportedNetworks).some((name) => name === network);
  }

  isEntryPointSupported(
    network: NetworkName | number,
    entryPoint: string
  ): boolean {
    if (typeof network === "number") {
      const networkName = this.getNetworkNameByChainId(network);
      if (!networkName) return false;
      return this.isEntryPointSupported(networkName, entryPoint);
    }
    const config = this.getNetworkConfig(network);
    return !!config?.entryPoints.some(
      (addr) => addr.toLowerCase() === entryPoint.toLowerCase()
    );
  }

  getNetworkNameByChainId(chainId: number): string | undefined {
    return Object.keys(this.supportedNetworks).find(
      (name) => this.supportedNetworks[name] === chainId
    );
  }

  private parseSupportedNetworks(): { [name: string]: number } {
    if (this.testingMode) {
      return { dev: 1337 };
    }
    const envNetworks = NETWORKS_ENV();
    let networkNames = envNetworks;
    if (!networkNames) {
      networkNames = Object.keys(this.config.networks);
    }
    return networkNames.reduce((networks, networkName) => {
      networks[networkName] = 0;
      return networks;
    }, {} as { [name: string]: number });
  }

  private parseNetworkConfigs(): Networks {
    const networks: Networks = {};
    for (const network of Object.keys(this.supportedNetworks)) {
      const config = this.getDefaultNetworkConfig(network);
      networks[network] = {
        ...config,
        name: network,
      };
    }
    return networks;
  }

  private getDefaultNetworkConfig(network: string): NetworkConfig {
    let conf = this.config.networks[network];
    if (!conf) {
      conf = {} as NetworkConfig;
    }
    const entryPoints = ENTRYPOINTS_ENV(network);
    conf.entryPoints = entryPoints || conf.entryPoints;
    conf.relayer = fromEnvVar(network, "RELAYER", conf.relayer);
    conf.beneficiary = fromEnvVar(network, "BENEFICIARY", conf.beneficiary);
    conf.rpcEndpoint = fromEnvVar(network, "RPC", conf.rpcEndpoint);

    if (this.testingMode && !conf.rpcEndpoint) {
      conf.rpcEndpoint = "http://localhost:8545"; // local geth
    }

    conf.etherscanApiKey = fromEnvVar(
      network,
      "ETHERSCAN_API_KEY",
      conf.etherscanApiKey || bundlerDefaultConfigs.etherscanApiKey
    );
    conf.receiptLookupRange = Number(
      fromEnvVar(
        network,
        "RECEIPT_LOOKUP_RANGE",
        conf.receiptLookupRange || bundlerDefaultConfigs.receiptLookupRange
      )
    );
    conf.conditionalTransactions = Boolean(
      fromEnvVar(
        network,
        "CONDITIONAL_TRANSACTIONS",
        conf.conditionalTransactions ||
          bundlerDefaultConfigs.conditionalTransactions
      )
    );
    conf.rpcEndpointSubmit = fromEnvVar(
      network,
      "RPC_SUBMIT",
      conf.rpcEndpointSubmit || bundlerDefaultConfigs.rpcEndpointSubmit
    );
    conf.gasPriceMarkup = Number(
      fromEnvVar(
        network,
        "GAS_PRICE_MARKUP",
        conf.gasPriceMarkup || bundlerDefaultConfigs.gasPriceMarkup
      )
    );
    conf.enforceGasPrice = Boolean(
      fromEnvVar(
        network,
        "ENFORCE_GAS_PRICE",
        conf.enforceGasPrice || bundlerDefaultConfigs.enforceGasPrice
      )
    );
    conf.enforceGasPriceThreshold = Number(
      fromEnvVar(
        network,
        "ENFORCE_GAS_PRICE_THRESHOLD",
        conf.enforceGasPriceThreshold ||
          bundlerDefaultConfigs.enforceGasPriceThreshold
      )
    );
    conf.eip2930 = Boolean(
      fromEnvVar(
        network,
        "EIP2930",
        conf.eip2930 || bundlerDefaultConfigs.eip2930
      )
    );
    conf.useropsTTL = Number(
      fromEnvVar(
        network,
        "USEROPS_TTL",
        conf.useropsTTL || bundlerDefaultConfigs.useropsTTL
      )
    );
    conf.estimationStaticBuffer = Number(
      fromEnvVar(
        network,
        "ESTIMATION_STATIC_BUFFER",
        conf.estimationStaticBuffer ||
          bundlerDefaultConfigs.estimationStaticBuffer
      )
    );

    return Object.assign({}, bundlerDefaultConfigs, conf);
  }
}

const bundlerDefaultConfigs: BundlerConfig = {
  minInclusionDenominator: 10,
  throttlingSlack: 10,
  banSlack: 10,
  minSignerBalance: utils.parseEther("0.1"),
  multicall: "0xcA11bde05977b3631167028862bE2a173976CA11", // default multicall address
  estimationStaticBuffer: 35000,
  validationGasLimit: 10e6,
  receiptLookupRange: 1024,
  etherscanApiKey: "",
  conditionalTransactions: false,
  rpcEndpointSubmit: "",
  gasPriceMarkup: 0,
  enforceGasPrice: false,
  enforceGasPriceThreshold: 1000,
  eip2930: false,
  useropsTTL: 300, // 5 minutes
};

const NETWORKS_ENV = (): string[] | undefined => {
  const networks = process.env["SKANDHA_NETWORKS"];
  if (networks) {
    return networks.replace(/ /g, "").split(",");
  }
  return undefined;
};
const ENTRYPOINTS_ENV = (network: string): string[] | undefined => {
  const entryPoints = fromEnvVar(network, "ENTRYPOINTS", "");
  if (entryPoints) {
    return entryPoints.toLowerCase().replace(/ /g, "").split(",");
  }
  return undefined;
};

/**
 * str = baseGoerli => SKANDHA_BASE_GOERLI
 * str = goerli = SKANDHA_GOERLI
 * str = baseGoerli, suffix = ENTRYPOINTS => SKANDHA_BASE_GOERLI_ENTRYPOINTS
 */
function strToEnv(str: string, suffix = ""): string {
  const prefix = `SKANDHA_${str.replace(/([A-Z])+/, "_$1").toUpperCase()}`;
  if (suffix) {
    return `${prefix}_${suffix}`;
  }
  return prefix;
}

function getEnvVar<T>(envVar: string, fallback: T): T | string {
  const env = process.env[envVar];
  if (!env) return fallback;
  return env;
}

function fromEnvVar<T>(
  networkName: string,
  suffix = "",
  fallback: T
): T | string {
  const envVar = strToEnv(networkName, suffix);
  return getEnvVar(envVar, fallback);
}
