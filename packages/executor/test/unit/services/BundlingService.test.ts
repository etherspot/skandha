import { describe, it, expect } from "vitest";
import { getConfigs, getModules, getClient, getWallet, createSignedUserOp, getCounterFactualAddress } from "../../fixtures";
import { EntryPointAddress } from "../../constants";
import { setBalance } from "../../utils";

describe("Bundling Service", async () => {
  await getClient(); // runs anvil

  const { service, ethModule, networkConfigUnsafe, debugModule } = await prepareTest();
  describe("Unsafe mode", async () => {
    it("Submitted bundle should contain configured number of userops", async () => {
      const { bundleSize } = networkConfigUnsafe;
      const userOpHashes = [];
      for (let i = 0; i < bundleSize; ++i) {
        const wallet = await getWallet(i);
        const aaWallet = await getCounterFactualAddress(wallet.address);
        await setBalance(aaWallet);
        const userOp = await createSignedUserOp(ethModule, wallet);
        const hash = await ethModule.sendUserOperation({
          userOp,
          entryPoint: EntryPointAddress
        });
        userOpHashes.push(hash);
      }
      expect(userOpHashes).toHaveLength(bundleSize);
      expect((await debugModule.dumpMempool())).toHaveLength(bundleSize);
      expect(await debugModule.sendBundleNow()).toBe("ok");

      // check that all userops are in the same bundle
      let txHash = null;
      for (let i = 0; i < bundleSize; ++i) {
        const response = await ethModule.getUserOperationByHash(userOpHashes[i]);
        if (!txHash) {
          txHash = response?.transactionHash;
        } else {
          expect(response?.transactionHash).toEqual(txHash);
        }
      }
    });
  });
});

async function prepareTest() {
  const { configUnsafe, networkConfigUnsafe } = await getConfigs();
  const {
    eth: ethModule,
    bundlingService: service,
    debug: debugModule
  } = await getModules(configUnsafe, networkConfigUnsafe);
  return { service, ethModule, networkConfigUnsafe, debugModule };
};
