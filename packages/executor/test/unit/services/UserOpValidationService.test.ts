import { describe, it, expect } from "vitest";
import { createRandomUnsignedUserOp, createSignedUserOp, getClient, getConfigs, getCounterFactualAddress, getModules, testAccounts } from "../../fixtures";
import { Wallet } from "ethers";
import { EntryPointAddress } from "../../constants";
import { setBalance } from "../../utils";

describe("UserOpValidation Service", async () => {
  await getClient(); // runs anvil

  describe("Unsafe mode", async () => {
    const wallet = new Wallet(testAccounts[0]);
    const aaWalletAddress = await getCounterFactualAddress(wallet.address);
    const { configUnsafe, networkConfigUnsafe } = await getConfigs();
    const { userOpValidationService: service, eth: ethModule } = await getModules(configUnsafe, networkConfigUnsafe);

    it("Validation should fail", async () => {
      await setBalance(aaWalletAddress);
      const userOp = await createRandomUnsignedUserOp(wallet.address);
      try {
        await service.simulateValidation(userOp, EntryPointAddress);
        expect.unreachable("Validation should fail");
      } catch (err) {}
    });

    it("Validation should success", async () => {
      await setBalance(aaWalletAddress);
      const userOp = await createSignedUserOp(ethModule, wallet);
      await service.simulateValidation(userOp, EntryPointAddress);
    });
  })
});
