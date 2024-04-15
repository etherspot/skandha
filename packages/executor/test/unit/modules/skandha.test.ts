import { describe, expect, it } from "vitest";
import { Wallet } from "ethers";
import { getClient, getConfigs, getModules } from "../../fixtures";
import { TestAccountMnemonic } from "../../constants";

describe("Skandha module", async () => {
  const client = await getClient(); // runs anvil
  const wallet = Wallet.fromMnemonic(TestAccountMnemonic).connect(client);

  const { config, networkConfig } = await getConfigs();
  const { skandha } = await getModules(config, networkConfig);

  it("getGasPrice should return actual onchain gas price", async () => {
    const gasFee = await client.getFeeData();
    const responseFromSkandha = await skandha.getGasPrice();
    expect(gasFee.maxFeePerGas).toEqual(responseFromSkandha.maxFeePerGas);
    expect(gasFee.maxPriorityFeePerGas).toEqual(responseFromSkandha.maxPriorityFeePerGas);
  });

  it("getConfig should return all config values and hide sensitive data", async () => {
    const configSkandha = await skandha.getConfig();
    expect(configSkandha.flags.redirectRpc).toEqual(config.redirectRpc);
    expect(configSkandha.flags.testingMode).toEqual(config.testingMode);
    expect(configSkandha.relayers).toEqual([wallet.address]);

    const sensitiveFields = [
      "relayers",
      "relayer",
      "rpcEndpoint",
      "name",
      "merkleApiURL",
      "kolibriAuthKey",
      "echoAuthKey"
    ];
    for (const [key, value] of Object.entries(networkConfig)) {
      if (sensitiveFields.indexOf(key) > -1) continue;
      if (!configSkandha.hasOwnProperty(key)) {
        throw new Error(`${key} is not defined in skandha_config`);
      }
    }
  });
});
