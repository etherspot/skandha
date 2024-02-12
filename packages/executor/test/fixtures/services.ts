import { BigNumber } from "ethers";
import { Config } from "../../src/config";
import { NetworkConfig } from "../../src/interfaces";
import { BundlingService, EntryPointService, MempoolService, ReputationService, UserOpValidationService } from "../../src/services";
import { LocalDbController } from "../mocks/database";
import { ChainId } from "../constants";
import { logger } from "../mocks/logger";

export async function getServices(config: Config, networkConfig: NetworkConfig) {
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
  const entryPointService = new EntryPointService(
    config.chainId,
    networkConfig,
    provider,
    reputationService,
    db,
    logger
  )

  const userOpValidationService = new UserOpValidationService(
    provider,
    entryPointService,
    reputationService,
    ChainId,
    config,
    logger
  );

  const mempoolService = new MempoolService(
    db,
    ChainId,
    entryPointService,
    reputationService,
    networkConfig
  );

  const bundlingService = new BundlingService(
    ChainId,
    provider,
    entryPointService,
    mempoolService,
    userOpValidationService,
    reputationService,
    config,
    logger,
    null,
    "classic"
  );

  bundlingService.setBundlingMode("manual");

  return {
    reputationService,
    userOpValidationService,
    mempoolService,
    bundlingService,
    entryPointService,
  }
}