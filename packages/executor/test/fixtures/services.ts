import { BigNumber } from "ethers";
import { Config } from "../../src/config";
import { NetworkConfig } from "../../src/interfaces";
import {
  BundlingService,
  EventsService,
  MempoolService,
  ReputationService,
  UserOpValidationService,
  SubscriptionService,
  ExecutorEventBus
} from "../../src/services";
import { LocalDbController } from "../mocks/database";
import { ChainId } from "../constants";
import { logger } from "../mocks/logger";
import { Skandha } from "../../src/modules";

export async function getServices(
  config: Config,
  networkConfig: NetworkConfig
) {
  const provider = config.getNetworkProvider();
  const db = new LocalDbController("test");
  const reputationService = new ReputationService(
    db,
    config.chainId,
    networkConfig.minInclusionDenominator,
    networkConfig.throttlingSlack,
    networkConfig.banSlack,
    BigNumber.from(networkConfig.minStake),
    networkConfig.minUnstakeDelay
  );

  const skandha = new Skandha(undefined, ChainId, provider, config, logger);

  const eventBus = new ExecutorEventBus();
  const subscriptionService = new SubscriptionService(eventBus, logger);

  const userOpValidationService = new UserOpValidationService(
    skandha,
    provider,
    reputationService,
    ChainId,
    config,
    logger
  );

  const mempoolService = new MempoolService(
    db,
    ChainId,
    reputationService,
    eventBus,
    networkConfig,
    logger
  );

  const bundlingService = new BundlingService(
    ChainId,
    provider,
    mempoolService,
    userOpValidationService,
    reputationService,
    config,
    logger,
    null,
    "classic"
  );

  bundlingService.setBundlingMode("manual");

  const eventsService = new EventsService(
    ChainId,
    provider,
    logger,
    reputationService,
    mempoolService,
    eventBus,
    networkConfig.entryPoints,
    db
  );
  eventsService.initEventListener();

  return {
    reputationService,
    userOpValidationService,
    mempoolService,
    bundlingService,
    eventsService,
    skandha,
    subscriptionService,
    eventBus,
  };
}
