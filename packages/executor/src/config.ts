// TODO: create a new package "config" instead of this file and refactor
import { BigNumber, Wallet, providers, utils } from "ethers";
import { NetworkName } from "types/lib";
import { IEntity, RelayingMode } from "types/lib/executor";
import { getAddress } from "ethers/lib/utils";
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

  getRelayers(network: string): Wallet[] | providers.JsonRpcSigner[] | null {
    const config = this.getNetworkConfig(network);
    if (!config) return null;

    const provider = this.getNetworkProvider(network);
    if (!provider) {
      throw new Error("no provider");
    }

    if (this.testingMode) {
      return [provider.getSigner()];
    }

    const wallets = [];
    for (const privKey of config.relayers) {
      if (privKey.startsWith("0x")) {
        wallets.push(new Wallet(privKey, provider));
      } else {
        wallets.push(Wallet.fromMnemonic(privKey).connect(provider));
      }
    }
    return wallets;
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
    conf.entryPoints = fromEnvVar(
      network,
      "ENTRYPOINTS",
      conf.entryPoints,
      true
    ) as string[];

    conf.relayer = fromEnvVar(network, "RELAYER", conf.relayer) as string; // deprecated
    conf.relayers = fromEnvVar(
      network,
      "RELAYERS",
      conf.relayers ?? [conf.relayer], // fallback to `relayer` if `relayers` not found
      true
    ) as string[];

    conf.beneficiary = fromEnvVar(
      network,
      "BENEFICIARY",
      conf.beneficiary || bundlerDefaultConfigs.beneficiary
    ) as string;
    conf.rpcEndpoint = fromEnvVar(network, "RPC", conf.rpcEndpoint) as string;

    if (this.testingMode && !conf.rpcEndpoint) {
      conf.rpcEndpoint = "http://localhost:8545"; // local geth
    }

    conf.etherscanApiKey = fromEnvVar(
      network,
      "ETHERSCAN_API_KEY",
      conf.etherscanApiKey || bundlerDefaultConfigs.etherscanApiKey
    ) as string;
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
    ) as string;
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
    conf.minStake = BigNumber.from(
      fromEnvVar(
        network,
        "MIN_STAKE",
        conf.minStake ?? bundlerDefaultConfigs.minStake
      )
    );
    conf.minUnstakeDelay = Number(
      fromEnvVar(
        network,
        "MIN_UNSTAKE_DELAY",
        conf.minUnstakeDelay || bundlerDefaultConfigs.minUnstakeDelay
      )
    );
    conf.bundleGasLimitMarkup = Number(
      fromEnvVar(
        network,
        "BUNDLE_GAS_LIMIT_MARKUP",
        conf.bundleGasLimitMarkup || bundlerDefaultConfigs.bundleGasLimitMarkup
      )
    );
    conf.relayingMode = fromEnvVar(
      network,
      "RELAYING_MODE",
      conf.relayingMode || bundlerDefaultConfigs.relayingMode
    ) as RelayingMode;

    conf.bundleInterval = Number(
      fromEnvVar(
        network,
        "BUNDLE_INTERVAL",
        conf.bundleInterval || bundlerDefaultConfigs.bundleInterval
      )
    );

    conf.bundleSize = Number(
      fromEnvVar(
        network,
        "BUNDLE_SIZE",
        conf.bundleSize || bundlerDefaultConfigs.bundleSize
      )
    );

    conf.pvgMarkup = Number(
      fromEnvVar(
        network,
        "PVG_MARKUP",
        conf.pvgMarkup || bundlerDefaultConfigs.pvgMarkup
      )
    );

    conf.gasFeeInSimulation = Boolean(
      fromEnvVar(
        network,
        "GAS_FEE_IN_SIMULATION",
        conf.gasFeeInSimulation || bundlerDefaultConfigs.gasFeeInSimulation
      )
    );

    conf.throttlingSlack = Number(
      fromEnvVar(
        network,
        "THROTTLING_SLACK",
        conf.throttlingSlack || bundlerDefaultConfigs.throttlingSlack
      )
    );

    conf.banSlack = Number(
      fromEnvVar(
        network,
        "BAN_SLACK",
        conf.banSlack || bundlerDefaultConfigs.banSlack
      )
    );

    conf.minInclusionDenominator = Number(
      fromEnvVar(
        network,
        "MIN_INCLUSION_DENOMINATOR",
        conf.minInclusionDenominator ||
          bundlerDefaultConfigs.minInclusionDenominator
      )
    );

    conf.merkleApiURL = String(
      fromEnvVar(
        network,
        "MERKLE_API_URL",
        conf.merkleApiURL || bundlerDefaultConfigs.merkleApiURL
      )
    );

    // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
    if (!conf.whitelistedEntities) {
      conf.whitelistedEntities = bundlerDefaultConfigs.whitelistedEntities;
    }

    /**
     * validate whitelist addresses
     */
    for (const entity of ["paymaster", "account", "factory"]) {
      conf.whitelistedEntities[entity as IEntity] = fromEnvVar(
        network,
        `WL_${entity.toUpperCase()}`,
        conf.whitelistedEntities[entity as IEntity],
        true
      ) as string[];
      const entities = conf.whitelistedEntities[entity as IEntity];
      if (typeof entities != "undefined" && typeof entities != "object") {
        throw new Error("Invalid config");
      }
      if (typeof entities == "object") {
        for (const address of entities) {
          // will throw error if the address is invalid
          getAddress(address);
        }
      }
    }

    return Object.assign({}, bundlerDefaultConfigs, conf);
  }
}

const bundlerDefaultConfigs: BundlerConfig = {
  beneficiary: "",
  minInclusionDenominator: 10,
  throttlingSlack: 10,
  banSlack: 50,
  minStake: utils.parseEther("0.01"),
  minUnstakeDelay: 0,
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
  whitelistedEntities: { paymaster: [], account: [], factory: [] },
  bundleGasLimitMarkup: 25000,
  bundleInterval: 10000, // 10 seconds
  bundleSize: 4, // max size of bundle (in terms of user ops)
  relayingMode: "classic",
  pvgMarkup: 0,
  gasFeeInSimulation: false,
  merkleApiURL: "https://pool.merkle.io",
};

const NETWORKS_ENV = (): string[] | undefined => {
  const networks = process.env["SKANDHA_NETWORKS"];
  if (networks) {
    return networks.replace(/ /g, "").split(",");
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
  fallback: T,
  isArray = false
): T | string | string[] {
  const envVarName = strToEnv(networkName, suffix);
  const envVarOrFallback = getEnvVar(envVarName, fallback);
  if (isArray && typeof envVarOrFallback === "string") {
    return (envVarOrFallback as string)
      .toLowerCase()
      .replace(/ /g, "")
      .split(",");
  }
  return envVarOrFallback;
}
