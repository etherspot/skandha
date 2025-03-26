// TODO: create a new package "config" instead of this file and refactor
import { IEntity, RelayingMode } from "@skandha/types/lib/executor";
import {
  createPublicClient,
  http,
  PublicClient,
  createWalletClient,
  WalletClient,
  Chain,
  Hex,
  parseEther,
  getAddress,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { BundlerConfig, ConfigOptions, NetworkConfig } from "./interfaces";
import { getViemChainDef } from "./services/BundlingService/utils/chains";

export class Config {
  testingMode: boolean;
  unsafeMode: boolean;
  redirectRpc: boolean;
  config: NetworkConfig;
  chainId: number;
  accounts: Hex[] = [];
  chain?: Chain;

  constructor(options: ConfigOptions) {
    this.testingMode = options.testingMode ?? false;
    this.unsafeMode = options.unsafeMode ?? false;
    this.redirectRpc = options.redirectRpc ?? false;
    this.config = this.getDefaultNetworkConfig(options.config);
    this.chainId = 0;
  }

  static async init(configOptions: ConfigOptions): Promise<Config> {
    const config = new Config(configOptions);
    try {
      await config.fetchChainId();
      await config.fetchAccounts();
    } catch (err) {
      // trying again with skipping ssl errors
      process.env["NODE_TLS_REJECT_UNAUTHORIZED"] = "0";
      await config.fetchChainId();
    }
    return config;
  }

  // replacement for getNetworkProvider()
  getPublicClient(): PublicClient {
    return createPublicClient({
      transport: http(this.config.rpcEndpoint),
      chain: this.chain,
    });
  }

  getRelayers(): WalletClient[] | null {
    if (this.testingMode) {
      return [
        createWalletClient({
          transport: http(this.config.rpcEndpoint),
          account: this.accounts[0],
        }),
      ];
    }

    const wallets = [];
    for (const privKey of this.config.relayers) {
      const wallet = createWalletClient({
        transport: http(this.config.rpcEndpoint),
        account: privateKeyToAccount(privKey as `0x${string}`),
        chain: this.chain,
      });
      wallets.push(wallet);
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
    const client = this.getPublicClient();

    try {
      this.chainId = await client.getChainId();
      this.chain = getViemChainDef(this.chainId);
    } catch (error) {
      throw new Error("Could not fetch chain id");
    }
  }

  async fetchAccounts(): Promise<void> {
    if (this.testingMode) {
      const walletClient = createWalletClient({
        transport: http(this.config.rpcEndpoint),
        chain: this.chain,
      });
      this.accounts = await walletClient.getAddresses();
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
      config.entryPoints ?? [],
      true
    ) as Hex[];

    config.relayers = fromEnvVar("RELAYERS", config.relayers, true) as Hex[];

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

    config.minStake = BigInt(
      fromEnvVar(
        "MIN_STAKE",
        config.minStake ?? bundlerDefaultConfigs.minStake
      ) as string
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

    config.gasFeeInSimulation = Boolean(
      fromEnvVar(
        "GAS_FEE_IN_SIMULATION",
        config.gasFeeInSimulation || bundlerDefaultConfigs.gasFeeInSimulation
      )
    );

    config.throttlingSlack = Number(
      fromEnvVar(
        "THROTTLING_SLACK",
        config.throttlingSlack || bundlerDefaultConfigs.throttlingSlack
      )
    );

    config.banSlack = Number(
      fromEnvVar("BAN_SLACK", config.banSlack || bundlerDefaultConfigs.banSlack)
    );

    config.minInclusionDenominator = Number(
      fromEnvVar(
        "MIN_INCLUSION_DENOMINATOR",
        config.minInclusionDenominator ||
          bundlerDefaultConfigs.minInclusionDenominator
      )
    );

    config.skipBundleValidation = Boolean(
      fromEnvVar(
        "SKIP_BUNDLE_VALIDATION",
        config.skipBundleValidation ||
          bundlerDefaultConfigs.skipBundleValidation
      )
    );

    config.bundleGasLimit = Number(
      fromEnvVar(
        "BUNDLE_GAS_LIMIT",
        config.bundleGasLimit || bundlerDefaultConfigs.bundleGasLimit
      )
    );

    config.userOpGasLimit = Number(
      fromEnvVar(
        "USEROP_GAS_LIMIT",
        config.userOpGasLimit || bundlerDefaultConfigs.userOpGasLimit
      )
    );

    config.merkleApiURL = String(
      fromEnvVar(
        "MERKLE_API_URL",
        config.merkleApiURL || bundlerDefaultConfigs.merkleApiURL
      )
    );

    config.kolibriAuthKey = String(
      fromEnvVar(
        "KOLIBRI_AUTH_KEY",
        config.kolibriAuthKey || bundlerDefaultConfigs.kolibriAuthKey
      )
    );

    config.cglMarkup = Number(
      fromEnvVar(
        "CGL_MARKUP",
        config.cglMarkup || bundlerDefaultConfigs.cglMarkup
      )
    );

    config.vglMarkup = Number(
      fromEnvVar(
        "VGL_MARKUP",
        config.vglMarkup || bundlerDefaultConfigs.vglMarkup
      )
    );

    config.fastlaneValidators = fromEnvVar(
      "FASTLANE_VALIDATOR",
      config.fastlaneValidators ?? bundlerDefaultConfigs.fastlaneValidators,
      true
    ) as string[];

    config.archiveDuration = Number(
      fromEnvVar(
        "ARCHIVE_DURATION",
        config.archiveDuration || bundlerDefaultConfigs.archiveDuration
      )
    );

    config.pvgMarkupPercent = Number(
      fromEnvVar(
        "PVG_MARKUP_PERCENT",
        config.pvgMarkupPercent || bundlerDefaultConfigs.pvgMarkupPercent
      )
    );
    config.cglMarkupPercent = Number(
      fromEnvVar(
        "CGL_MARKUP_PERCENT",
        config.cglMarkupPercent || bundlerDefaultConfigs.cglMarkupPercent
      )
    );
    config.vglMarkupPercent = Number(
      fromEnvVar(
        "VGL_MARKUP_PERCENT",
        config.vglMarkupPercent || bundlerDefaultConfigs.vglMarkupPercent
      )
    );

    config.eip1559 = Boolean(
      fromEnvVar(
        "EIP1559",
        config.eip1559 !== undefined
          ? config.eip1559
          : bundlerDefaultConfigs.eip1559
      )
    );

    config.blockscoutUrl = String(
      fromEnvVar(
        "BLOCKSCOUT_URL",
        config.blockscoutUrl || bundlerDefaultConfigs.blockscoutUrl
      )
    );

    config.tenderlyApiUrl = String(
      fromEnvVar(
        "TENDERLY_API_URL",
        config.tenderlyApiUrl || bundlerDefaultConfigs.tenderlyApiUrl
      )
    );

    config.tenderlyKey = String(
      fromEnvVar(
        "TENDERLY_KEY",
        config.tenderlyKey || bundlerDefaultConfigs.tenderlyKey
      )
    );

    config.tenderlySave = Boolean(
      fromEnvVar(
        "TENDERLY_SAVE",
        config.tenderlySave === false
          ? config.tenderlySave
          : bundlerDefaultConfigs.tenderlySave
      )
    );

    config.rpcTimeout = String(
      fromEnvVar(
        "RPC_TIMEOUT",
        config.rpcTimeout || bundlerDefaultConfigs.rpcTimeout
      )
    );

    config.eip7702 = Boolean(
      fromEnvVar("EIP7702", config.eip7702 || bundlerDefaultConfigs.eip7702)
    );

    config.blockscoutApiKeys = fromEnvVar(
      "BLOCKSCOUT_API_KEYS",
      config.blockscoutApiKeys != undefined
        ? config.blockscoutApiKeys
        : bundlerDefaultConfigs.blockscoutApiKeys,
      true
    ) as string[];

    // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
    if (!config.whitelistedEntities) {
      config.whitelistedEntities = bundlerDefaultConfigs.whitelistedEntities;
    }

    /**
     * validate whitelist addresses
     */
    for (const entity of ["paymaster", "account", "factory", "external"]) {
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
  minStake: parseEther("0.01"),
  minUnstakeDelay: 0,
  minSignerBalance: parseEther("0.1"),
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
  whitelistedEntities: {
    paymaster: [],
    account: [],
    factory: [],
    external: [],
  },
  bundleGasLimitMarkup: 25000,
  bundleInterval: 10000, // 10 seconds
  bundleSize: 4, // max size of bundle (in terms of user ops)
  relayingMode: "classic",
  canonicalMempoolId: "",
  canonicalEntryPoint: "",
  gasFeeInSimulation: false,
  skipBundleValidation: false,
  userOpGasLimit: 25000000,
  bundleGasLimit: 25000000,
  merkleApiURL: "https://pool.merkle.io",
  kolibriAuthKey: "",
  cglMarkup: 35000,
  vglMarkup: 0,
  pvgMarkup: 0,
  echoAuthKey: "",
  fastlaneValidators: [],
  archiveDuration: 24 * 3600,
  estimationGasLimit: 0,
  pvgMarkupPercent: 0,
  cglMarkupPercent: 0,
  vglMarkupPercent: 3000, // 30%
  eip1559: true,
  blockscoutUrl: "",
  blockscoutApiKeys: [],
  tenderlyApiUrl: "",
  tenderlyKey: "",
  tenderlySave: true,
  rpcTimeout: "10s",
  eip7702: false,
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
