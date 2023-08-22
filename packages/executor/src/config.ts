// TODO: create a new package "config" instead of this file and refactor
import { NetworkName } from "types/lib";
import { Wallet, providers, utils } from "ethers";
import {
  BundlerConfig,
  ConfigOptions,
  NetworkConfig,
  Networks,
} from "./interfaces";

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
    const endpoint = conf?.rpcEndpoint;
    return endpoint ? new providers.JsonRpcProvider(endpoint) : null;
  }

  getRelayer(network: NetworkName): Wallet | providers.JsonRpcSigner | null {
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
      const config = this.getDefaultNetworkConfig(network);
      networks[network] = {
        ...config,
        name: network,
      };
    }
    return networks;
  }

  private getDefaultNetworkConfig(network: NetworkName): NetworkConfig {
    let conf = this.config.networks[network];
    if (!conf) {
      conf = {} as NetworkConfig;
    }
    const entryPoints = ENTRYPOINTS_ENV(network);
    conf.entryPoints = entryPoints || conf.entryPoints;
    conf.relayer = fromEnvVar(network, "RELAYER", conf.relayer);
    conf.beneficiary = fromEnvVar(network, "BENEFICIARY", conf.beneficiary);
    conf.rpcEndpoint = fromEnvVar(network, "RPC", conf.rpcEndpoint);

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

    return Object.assign({}, bundlerDefaultConfigs, conf);
  }
}

const bundlerDefaultConfigs: BundlerConfig = {
  minInclusionDenominator: 10,
  throttlingSlack: 10,
  banSlack: 10,
  minSignerBalance: utils.parseEther("0.1"),
  multicall: "0xcA11bde05977b3631167028862bE2a173976CA11", // default multicall address
  estimationStaticBuffer: 21000,
  validationGasLimit: 10e6,
  receiptLookupRange: 1024,
  etherscanApiKey: "",
  conditionalTransactions: false,
  rpcEndpointSubmit: "",
  gasPriceMarkup: 0,
  enforceGasPrice: false,
  enforceGasPriceThreshold: 1000,
};

const NETWORKS_ENV = (): string[] | undefined => {
  const networks = process.env["SKANDHA_NETWORKS"];
  if (networks) {
    return networks.replace(/ /g, "").split(",");
  }
  return undefined;
};
const ENTRYPOINTS_ENV = (network: NetworkName): string[] | undefined => {
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
