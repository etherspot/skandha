/* eslint-disable @typescript-eslint/explicit-member-accessibility */
import { BigNumber, providers } from "ethers";
import { IDbController, NetworkName, Logger } from "types/lib";
import { INodeAPI } from "types/lib/node";
import { chainsWithoutEIP1559 } from "params/lib";
import { IChainMetrics } from "monitoring/lib";
import { Web3, Debug, Eth, Skandha } from "./modules";
import {
  MempoolService,
  UserOpValidationService,
  BundlingService,
  ReputationService,
  P2PService,
} from "./services";
import { Config } from "./config";
import { BundlingMode, NetworkConfig } from "./interfaces";

export interface ExecutorOptions {
  network: NetworkName;
  chainId: number;
  db: IDbController;
  config: Config;
  logger: Logger;
  nodeApi?: INodeAPI;
  bundlingMode: BundlingMode;
  metrics: IChainMetrics | null;
}

export class Executor {
  private networkConfig: NetworkConfig;
  private logger: Logger;
  private metrics: IChainMetrics | null;

  public chainId: number;
  public networkName: NetworkName;
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

  private db: IDbController;

  private nodeApi: INodeAPI | undefined;

  constructor(options: ExecutorOptions) {
    this.db = options.db;
    this.networkName = options.network;
    this.config = options.config;
    this.logger = options.logger;
    this.chainId = options.chainId;
    this.nodeApi = options.nodeApi;
    this.metrics = options.metrics;

    this.networkConfig = options.config.networks[
      options.network
    ] as NetworkConfig;

    this.provider = this.config.getNetworkProvider(
      this.networkName
    ) as providers.JsonRpcProvider;

    this.reputationService = new ReputationService(
      this.db,
      this.chainId,
      this.networkConfig.minInclusionDenominator,
      this.networkConfig.throttlingSlack,
      this.networkConfig.banSlack,
      BigNumber.from(1),
      0
    );
    this.userOpValidationService = new UserOpValidationService(
      this.provider,
      this.reputationService,
      this.chainId,
      this.networkName,
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
      this.networkName,
      this.provider,
      this.mempoolService,
      this.userOpValidationService,
      this.reputationService,
      this.config,
      this.logger,
      this.metrics
    );
    this.web3 = new Web3(this.config);
    this.debug = new Debug(
      this.provider,
      this.bundlingService,
      this.mempoolService,
      this.reputationService
    );
    this.skandha = new Skandha(
      this.networkName,
      this.chainId,
      this.provider,
      this.config,
      this.logger
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
      this.nodeApi
    );
    this.p2pService = new P2PService(
      this.provider,
      this.mempoolService,
      this.bundlingService,
      this.config,
      this.logger
    );

    if (this.config.testingMode || options.bundlingMode == "manual") {
      this.bundlingService.setBundlingMode("manual");
      this.logger.info(`${this.networkName}: set to manual bundling mode`);
    }

    if (this.networkConfig.conditionalTransactions) {
      this.logger.info(`${this.networkName}: [x] CONDITIONAL TRANSACTIONS`);
    }

    if (this.networkConfig.rpcEndpointSubmit) {
      this.logger.info(
        `${this.networkName}: [x] SEPARATE RPC FOR SUBMITTING BUNDLES`
      );
    }

    if (this.networkConfig.enforceGasPrice) {
      this.logger.info(`${this.networkName}: [x] ENFORCING GAS PRICES`);
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
      this.logger.info(`${this.networkName}: [x] EIP2930 ENABLED`);
    }

    this.logger.info(
      `${this.networkName}: [x] USEROPS TTL - ${this.networkConfig.useropsTTL}`
    );
  }
}
