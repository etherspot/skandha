import { utils } from "ethers";
import { Config } from "../../src/config";
import {
  DefaultRpcUrl,
  EntryPointAddress,
  TestAccountMnemonic,
} from "../constants";
import { ConfigOptions, NetworkConfig } from "../../src/interfaces";

const BaseConfig: ConfigOptions = {
  config: {
    entryPoints: [EntryPointAddress],
    relayers: [TestAccountMnemonic],
    rpcEndpoint: DefaultRpcUrl,
    beneficiary: "",
    minInclusionDenominator: 10,
    throttlingSlack: 10,
    banSlack: 50,
    minStake: utils.parseEther("0.01"),
    minUnstakeDelay: 0,
    minSignerBalance: utils.parseEther("0.1"),
    multicall: "0xcA11bde05977b3631167028862bE2a173976CA11",
    validationGasLimit: 10e6,
    receiptLookupRange: 1024,
    etherscanApiKey: "",
    conditionalTransactions: false,
    rpcEndpointSubmit: "",
    gasPriceMarkup: 0,
    enforceGasPrice: false,
    enforceGasPriceThreshold: 1000,
    eip2930: false,
    useropsTTL: 300,
    whitelistedEntities: { paymaster: [], account: [], factory: [] },
    bundleGasLimitMarkup: 25000,
    bundleInterval: 100,
    bundleSize: 4,
    relayingMode: "classic",
    pvgMarkup: 0,
    canonicalMempoolId: "",
    canonicalEntryPoint: EntryPointAddress,
    cglMarkup: 35000,
    vglMarkup: 0,
    skipBundleValidation: false,
    entryPointForwarder: "",
    gasFeeInSimulation: true,
    userOpGasLimit: 10000000,
    bundleGasLimit: 60000000,
    merkleApiURL: "",
    echoAuthKey: "",
    kolibriAuthKey: "",
    archiveDuration: 60, // 1 minute
  },
  testingMode: false,
  unsafeMode: false,
  redirectRpc: false,
};

let config: Config,
  networkConfig: NetworkConfig,
  configUnsafe: Config,
  networkConfigUnsafe: NetworkConfig;

export async function getConfigs() {
  if (!config) {
    config = await Config.init(BaseConfig);
    networkConfig = config.getNetworkConfig();

    configUnsafe = await Config.init({
      ...BaseConfig,
      unsafeMode: true,
    });
    networkConfigUnsafe = configUnsafe.getNetworkConfig();
  }
  return {
    config,
    networkConfig,
    configUnsafe,
    networkConfigUnsafe,
  };
}
