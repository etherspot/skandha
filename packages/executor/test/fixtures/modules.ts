import { Config } from "../../src/config";
import { NetworkConfig } from "../../src/interfaces";
import { ChainId } from "../constants";
import { logger } from "../mocks/logger";
import { getServices } from "./services";
import { Web3, Debug, Skandha, Eth } from "../../src/modules";

export async function getModules(config: Config, networkConfig: NetworkConfig) {
  const provider = config.getNetworkProvider()!;
  const {
    reputationService,
    userOpValidationService,
    mempoolService,
    bundlingService,
    entryPointService,
  } = await getServices(config, networkConfig);

  const web3 = new Web3(config, {
    version: "test",
    commit: "commit"
  });
  const debug = new Debug(
    provider,
    entryPointService,
    bundlingService,
    mempoolService,
    reputationService,
    networkConfig
  );
  const skandha = new Skandha(
    entryPointService,
    ChainId,
    provider,
    config,
    logger
  );
  const eth = new Eth(
    ChainId,
    provider,
    entryPointService,
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
  }
}
