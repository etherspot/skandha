import {describe, it, expect} from "vitest";
import { createRandomUnsignedUserOp, getClient, getConfigs, getCounterFactualAddress, getModules, signUserOp, testAccounts } from "../../fixtures";
import { Wallet } from "ethers";
import { EntryPointAddress } from "../../constants";
import { applyEstimatedUserOp, topUpAccount } from "../../utils";

describe("UserOpValidation Service", async () => {
  await getClient(); // runs anvil

  describe("Unsafe mode", async () => {
    const wallet = new Wallet(testAccounts[0]);
    const aaWalletAddress = await getCounterFactualAddress(wallet.address);
    await topUpAccount(aaWalletAddress);
    const { configUnsafe, networkConfigUnsafe } = await getConfigs();
    const { userOpValidationService: service, eth: ethModule } = await getModules(configUnsafe, networkConfigUnsafe);

    it("Validation should fail", async () => {
      const userOp = await createRandomUnsignedUserOp(wallet.address);
      try {
        await service.simulateValidation(userOp, EntryPointAddress);
        expect.unreachable("Validation should fail");
      } catch (err) {}
    });

    it("Validation should success", async () => {
      let unsignedUserOp = await createRandomUnsignedUserOp(wallet.address);
      const response = await ethModule.estimateUserOperationGas({
        userOp: unsignedUserOp,
        entryPoint: EntryPointAddress
      });
      unsignedUserOp = applyEstimatedUserOp(unsignedUserOp, response);
      const userOp = await signUserOp(wallet, unsignedUserOp);
      await service.simulateValidation(userOp, EntryPointAddress);
    });
  })
});
