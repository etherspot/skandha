import { Config } from "../../src/config";
import { NetworkConfig } from "../../src/interfaces";
import { ChainId } from "../constants";
import { logger } from "../mocks/logger";
import { Web3, Debug, Eth } from "../../src/modules";
import { getServices } from "./services";

export async function getModules(config: Config, networkConfig: NetworkConfig) {
  const provider = config.getNetworkProvider()!;
  const {
    reputationService,
    userOpValidationService,
    mempoolService,
    bundlingService,
    skandha,
    eventsService,
  } = await getServices(config, networkConfig);

  const web3 = new Web3(config, {
    version: "test",
    commit: "commit",
  });
  const debug = new Debug(
    provider,
    bundlingService,
    mempoolService,
    reputationService,
    networkConfig
  );

  const eth = new Eth(
    ChainId,
    provider,
    userOpValidationService,
    mempoolService,
    skandha,
    networkConfig,
    logger,
    null, // metrics
    undefined // INodeAPI
  );

  return {
    web3,
    debug,
    skandha,
    eth,
    reputationService,
    userOpValidationService,
    mempoolService,
    bundlingService,
    eventsService,
  };
}
