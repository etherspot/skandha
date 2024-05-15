// TODO: create a new package "config" instead of this file and refactor
import { BigNumber, Wallet, providers, utils } from "ethers";
import { IEntity, RelayingMode } from "@skandha/types/lib/executor";
import { getAddress } from "ethers/lib/utils";
import { BundlerConfig, ConfigOptions, NetworkConfig } from "./interfaces";

export class Config {
  testingMode: boolean;
  unsafeMode: boolean;
  redirectRpc: boolean;
  config: NetworkConfig;
  chainId: number;

  constructor(options: ConfigOptions) {
    this.testingMode = options.testingMode ?? false;
    this.unsafeMode = options.unsafeMode ?? false;
    this.redirectRpc = options.redirectRpc ?? false;
    this.config = this.getDefaultNetworkConfig(options.config);
    this.chainId = 0;
  }

  static async init(configOptions: ConfigOptions): Promise<Config> {
    const config = new Config(configOptions);
    await config.fetchChainId();
    return config;
  }

  getNetworkProvider(): providers.JsonRpcProvider {
    return new providers.JsonRpcProvider(this.config.rpcEndpoint);
  }

  getRelayers(): Wallet[] | providers.JsonRpcSigner[] | null {
    const provider = this.getNetworkProvider();

    if (this.testingMode) {
      return [provider.getSigner()];
    }

    const wallets = [];
    for (const privKey of this.config.relayers) {
      if (privKey.startsWith("0x")) {
        wallets.push(new Wallet(privKey, provider));
      } else {
        wallets.push(Wallet.fromMnemonic(privKey).connect(provider));
      }
    }
    return wallets;
  }

  getBeneficiary(): string | null {
    return this.config.beneficiary;
  }

  getNetworkConfig(): NetworkConfig {
    return this.config;
  }

  getCanonicalMempool(): { entryPoint: string; mempoolId: string } {
    return {
      entryPoint: this.config.canonicalEntryPoint,
      mempoolId: this.config.canonicalMempoolId,
    };
  }

  async fetchChainId(): Promise<void> {
    const provider = this.getNetworkProvider();
    try {
      const network = await provider.getNetwork();
      this.chainId = network.chainId;
    } catch (err) {
      throw new Error("Could not fetch chain id");
    }
  }

  isEntryPointSupported(entryPoint: string): boolean {
    return this.config.entryPoints.some(
      (addr) => addr.toLowerCase() === entryPoint.toLowerCase()
    );
  }

  private getDefaultNetworkConfig(config: NetworkConfig | null): NetworkConfig {
    if (config == null) config = {} as NetworkConfig;
    config.entryPoints = fromEnvVar(
      "ENTRYPOINTS",
      config.entryPoints || [],
      true
    ) as string[];

    config.relayers = fromEnvVar("RELAYERS", config.relayers, true) as string[];

    config.beneficiary = fromEnvVar(
      "BENEFICIARY",
      config.beneficiary || bundlerDefaultConfigs.beneficiary
    ) as string;

    config.rpcEndpoint = fromEnvVar("RPC", config.rpcEndpoint) as string;

    if (this.testingMode && !config.rpcEndpoint) {
      config.rpcEndpoint = "http://localhost:8545"; // local geth
    }

    config.etherscanApiKey = fromEnvVar(
      "ETHERSCAN_API_KEY",
      config.etherscanApiKey || bundlerDefaultConfigs.etherscanApiKey
    ) as string;
    config.receiptLookupRange = Number(
      fromEnvVar(
        "RECEIPT_LOOKUP_RANGE",
        config.receiptLookupRange || bundlerDefaultConfigs.receiptLookupRange
      )
    );
    config.conditionalTransactions = Boolean(
      fromEnvVar(
        "CONDITIONAL_TRANSACTIONS",
        config.conditionalTransactions ||
          bundlerDefaultConfigs.conditionalTransactions
      )
    );
    config.rpcEndpointSubmit = fromEnvVar(
      "RPC_SUBMIT",
      config.rpcEndpointSubmit || bundlerDefaultConfigs.rpcEndpointSubmit
    ) as string;
    config.gasPriceMarkup = Number(
      fromEnvVar(
        "GAS_PRICE_MARKUP",
        config.gasPriceMarkup || bundlerDefaultConfigs.gasPriceMarkup
      )
    );
    config.enforceGasPrice = Boolean(
      fromEnvVar(
        "ENFORCE_GAS_PRICE",
        config.enforceGasPrice || bundlerDefaultConfigs.enforceGasPrice
      )
    );
    config.enforceGasPriceThreshold = Number(
      fromEnvVar(
        "ENFORCE_GAS_PRICE_THRESHOLD",
        config.enforceGasPriceThreshold ||
          bundlerDefaultConfigs.enforceGasPriceThreshold
      )
    );
    config.eip2930 = Boolean(
      fromEnvVar("EIP2930", config.eip2930 || bundlerDefaultConfigs.eip2930)
    );
    config.useropsTTL = Number(
      fromEnvVar(
        "USEROPS_TTL",
        config.useropsTTL || bundlerDefaultConfigs.useropsTTL
      )
    );
    config.estimationStaticBuffer = Number(
      fromEnvVar(
        "ESTIMATION_STATIC_BUFFER",
        config.estimationStaticBuffer ||
          bundlerDefaultConfigs.estimationStaticBuffer
      )
    );
    config.minStake = BigNumber.from(
      fromEnvVar("MIN_STAKE", config.minStake ?? bundlerDefaultConfigs.minStake)
    );
    config.minUnstakeDelay = Number(
      fromEnvVar(
        "MIN_UNSTAKE_DELAY",
        config.minUnstakeDelay || bundlerDefaultConfigs.minUnstakeDelay
      )
    );
    config.bundleGasLimitMarkup = Number(
      fromEnvVar(
        "BUNDLE_GAS_LIMIT_MARKUP",
        config.bundleGasLimitMarkup ||
          bundlerDefaultConfigs.bundleGasLimitMarkup
      )
    );
    config.relayingMode = fromEnvVar(
      "RELAYING_MODE",
      config.relayingMode || bundlerDefaultConfigs.relayingMode
    ) as RelayingMode;

    config.bundleInterval = Number(
      fromEnvVar(
        "BUNDLE_INTERVAL",
        config.bundleInterval || bundlerDefaultConfigs.bundleInterval
      )
    );

    config.bundleSize = Number(
      fromEnvVar(
        "BUNDLE_SIZE",
        config.bundleSize || bundlerDefaultConfigs.bundleSize
      )
    );

    config.pvgMarkup = Number(
      fromEnvVar(
        "PVG_MARKUP",
        config.pvgMarkup || bundlerDefaultConfigs.pvgMarkup
      )
    );

    config.canonicalMempoolId = String(
      fromEnvVar(
        "CANONICAL_MEMPOOL",
        config.canonicalMempoolId || bundlerDefaultConfigs.canonicalMempoolId
      )
    );

    config.canonicalEntryPoint = String(
      fromEnvVar(
        "CANONICAL_ENTRY_POINT",
        config.canonicalEntryPoint || bundlerDefaultConfigs.canonicalEntryPoint
      )
    );

    // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
    if (!config.whitelistedEntities) {
      config.whitelistedEntities = bundlerDefaultConfigs.whitelistedEntities;
    }

    /**
     * validate whitelist addresses
     */
    for (const entity of ["paymaster", "account", "factory"]) {
      config.whitelistedEntities[entity as IEntity] = fromEnvVar(
        `WL_${entity.toUpperCase()}`,
        config.whitelistedEntities[entity as IEntity],
        true
      ) as string[];
      const entities = config.whitelistedEntities[entity as IEntity];
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

    return Object.assign({}, bundlerDefaultConfigs, config);
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
  canonicalMempoolId: "",
  canonicalEntryPoint: "",
};

function getEnvVar<T>(envVar: string, fallback: T): T | string {
  const env = process.env[envVar];
  if (!env) return fallback;
  return env;
}

function fromEnvVar<T>(
  envVar = "",
  fallback: T,
  isArray = false
): T | string | string[] {
  const envVarName = `SKANDHA_${envVar}`;
  const envVarOrFallback = getEnvVar(envVarName, fallback);
  if (isArray && typeof envVarOrFallback === "string") {
    return (envVarOrFallback as string)
      .toLowerCase()
      .replace(/ /g, "")
      .split(",");
  }
  return envVarOrFallback;
}
