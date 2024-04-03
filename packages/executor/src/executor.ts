/* eslint-disable @typescript-eslint/explicit-member-accessibility */
import { BigNumber, providers } from "ethers";
import { IDbController, Logger } from "types/lib";
import { chainsWithoutEIP1559 } from "params/lib";
import { PerChainMetrics } from "monitoring/lib";
import { SkandhaVersion } from "types/lib/executor";
import { Web3, Debug, Eth, Skandha } from "./modules";
import {
  MempoolService,
  UserOpValidationService,
  BundlingService,
  ReputationService,
  P2PService,
  EventsService,
} from "./services";
import { Config } from "./config";
import { BundlingMode, GetNodeAPI, NetworkConfig } from "./interfaces";

export interface ExecutorOptions {
  version: SkandhaVersion;
  chainId: number;
  db: IDbController;
  config: Config;
  logger: Logger;
  getNodeApi?: GetNodeAPI;
  bundlingMode: BundlingMode;
  metrics: PerChainMetrics | null;
}

export class Executor {
  private networkConfig: NetworkConfig;
  private logger: Logger;
  private metrics: PerChainMetrics | null;

  public version: SkandhaVersion;
  public chainId: number;
  public config: Config;
  public provider: providers.JsonRpcProvider;

  public web3: Web3;
  public debug: Debug;
  public eth: Eth;
  public skandha: Skandha;

  public bundlingService: BundlingService;
  public mempoolService: MempoolService;
  public userOpValidationService: UserOpValidationService;
  public reputationService: ReputationService;
  public p2pService: P2PService;
  public eventsService: EventsService;

  private db: IDbController;

  private getNodeApi: GetNodeAPI;

  constructor(options: ExecutorOptions) {
    this.version = options.version;
    this.db = options.db;
    this.config = options.config;
    this.logger = options.logger;
    this.chainId = options.chainId;
    this.getNodeApi = options.getNodeApi ?? (() => null);
    this.metrics = options.metrics;

    this.networkConfig = options.config.getNetworkConfig();

    this.provider = this.config.getNetworkProvider();

    this.reputationService = new ReputationService(
      this.db,
      this.chainId,
      this.networkConfig.minInclusionDenominator,
      this.networkConfig.throttlingSlack,
      this.networkConfig.banSlack,
      BigNumber.from(this.networkConfig.minStake),
      this.networkConfig.minUnstakeDelay
    );
    this.userOpValidationService = new UserOpValidationService(
      this.provider,
      this.reputationService,
      this.chainId,
      this.config,
      this.logger
    );
    this.mempoolService = new MempoolService(
      this.db,
      this.chainId,
      this.reputationService,
      this.networkConfig
    );
    this.bundlingService = new BundlingService(
      this.chainId,
      this.provider,
      this.mempoolService,
      this.userOpValidationService,
      this.reputationService,
      this.config,
      this.logger,
      this.metrics,
      this.networkConfig.relayingMode
    );
    this.eventsService = new EventsService(
      this.chainId,
      this.provider,
      this.logger,
      this.reputationService,
      this.networkConfig.entryPoints,
      this.db
    );
    this.eventsService.initEventListener();

    this.web3 = new Web3(this.config, this.version);
    this.debug = new Debug(
      this.provider,
      this.bundlingService,
      this.mempoolService,
      this.reputationService,
      this.networkConfig
    );
    this.skandha = new Skandha(
      this.getNodeApi,
      this.chainId,
      this.provider,
      this.config,
      this.logger,
    );
    this.eth = new Eth(
      this.chainId,
      this.provider,
      this.userOpValidationService,
      this.mempoolService,
      this.skandha,
      this.networkConfig,
      this.logger,
      this.metrics,
      this.getNodeApi
    );
    this.p2pService = new P2PService(this.mempoolService);

    if (this.config.testingMode || options.bundlingMode == "manual") {
      this.bundlingService.setBundlingMode("manual");
      this.logger.info("[X] MANUAL BUNDLING");
    }
    if (this.config.testingMode) {
      this.bundlingService.setMaxBundleSize(10);
    }

    if (this.networkConfig.relayingMode === "flashbots") {
      if (!this.networkConfig.rpcEndpointSubmit)
        throw Error(
          "If you want to use Flashbots Builder API, please set API url in 'rpcEndpointSubmit' in config file"
        );
      this.logger.info("[X] FLASHBOTS BUIDLER API");
    }

    if (this.networkConfig.conditionalTransactions) {
      this.logger.info("[x] CONDITIONAL TRANSACTIONS");
    }

    if (this.networkConfig.rpcEndpointSubmit) {
      this.logger.info("[x] SEPARATE RPC FOR SUBMITTING BUNDLES");
    }

    if (this.networkConfig.enforceGasPrice) {
      this.logger.info("[x] ENFORCING GAS PRICES");
    }

    // can't use eip2930 in unsafeMode and on chains that dont support 1559
    if (
      (this.config.unsafeMode ||
        chainsWithoutEIP1559.some((chainId) => chainId === this.chainId)) &&
      this.networkConfig.eip2930
    ) {
      this.logger.error(
        "Can not use EIP-2930 in unsafe mode or on chains that dont supports EIP-1559"
      );
      throw new Error("disable EIP2930");
    }

    if (this.networkConfig.eip2930) {
      this.logger.info("[x] EIP2930 ENABLED");
    }

    this.logger.info(`[x] USEROPS TTL - ${this.networkConfig.useropsTTL}`);
  }
}
