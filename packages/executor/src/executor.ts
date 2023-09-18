/* eslint-disable @typescript-eslint/explicit-member-accessibility */
import { BigNumber, providers } from "ethers";
import { NETWORK_NAME_TO_CHAIN_ID, NetworkName } from "types/lib";
import { IDbController } from "types/lib";
import { INodeAPI } from "types/lib/node";
import { Web3, Debug, Eth, Skandha } from "./modules";
import {
  MempoolService,
  UserOpValidationService,
  BundlingService,
  ReputationService,
  P2PService,
} from "./services";
import { Config } from "./config";
import { BundlingMode, Logger, NetworkConfig } from "./interfaces";

export interface ExecutorOptions {
  network: NetworkName;
  db: IDbController;
  config: Config;
  logger: Logger;
  nodeApi?: INodeAPI;
  bundlingMode: BundlingMode;
}

export class Executor {
  private networkConfig: NetworkConfig;
  private logger: Logger;

  public network: NetworkName;
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
    this.network = options.network;
    this.config = options.config;
    this.logger = options.logger;
    this.nodeApi = options.nodeApi;

    this.networkConfig = options.config.networks[
      options.network
    ] as NetworkConfig;

    this.provider = this.config.getNetworkProvider(
      this.network
    ) as providers.JsonRpcProvider;

    const chainId = Number(NETWORK_NAME_TO_CHAIN_ID[this.network]);
    this.reputationService = new ReputationService(
      this.db,
      chainId,
      this.networkConfig.minInclusionDenominator,
      this.networkConfig.throttlingSlack,
      this.networkConfig.banSlack,
      BigNumber.from(1),
      0
    );
    this.userOpValidationService = new UserOpValidationService(
      this.provider,
      this.reputationService,
      this.network,
      this.config,
      this.logger
    );
    this.mempoolService = new MempoolService(
      this.db,
      chainId,
      this.reputationService
    );
    this.bundlingService = new BundlingService(
      this.network,
      this.provider,
      this.mempoolService,
      this.userOpValidationService,
      this.reputationService,
      this.config,
      this.logger
    );
    this.web3 = new Web3(this.config);
    this.debug = new Debug(
      this.provider,
      this.bundlingService,
      this.mempoolService,
      this.reputationService
    );
    this.eth = new Eth(
      this.network,
      this.provider,
      this.userOpValidationService,
      this.mempoolService,
      this.networkConfig,
      this.logger,
      this.nodeApi
    );
    this.p2pService = new P2PService(
      this.provider,
      this.mempoolService,
      this.bundlingService,
      this.config,
      this.logger
    );
    this.skandha = new Skandha(
      this.network,
      this.provider,
      this.config,
      this.logger
    );

    if (this.config.testingMode || options.bundlingMode == "manual") {
      this.bundlingService.setBundlingMode("manual");
      this.logger.info(`${this.network}: set to manual bundling mode`);
    }

    if (this.networkConfig.conditionalTransactions) {
      this.logger.info(`${this.network}: [x] CONDITIONAL TRANSACTIONS`);
    }

    if (this.networkConfig.rpcEndpointSubmit) {
      this.logger.info(
        `${this.network}: [x] SEPARATE RPC FOR SUBMITTING BUNDLES`
      );
    }

    if (this.networkConfig.enforceGasPrice) {
      this.logger.info(`${this.network}: [x] ENFORCING GAS PRICES`);
    }
  }
}
