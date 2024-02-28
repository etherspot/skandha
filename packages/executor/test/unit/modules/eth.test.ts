import { describe, expect, it } from "vitest";
import { Wallet } from "ethers";
import { createRandomUnsignedUserOp, getClient, getConfigs, getCounterFactualAddress, getModules, testAccounts } from "../../fixtures";
import { setBalance } from "../../utils";
import { EntryPointAddress } from "../../constants";
import { EstimatedUserOperationGas } from "types/src/api/interfaces";

describe("Eth module", async () => {
  const client = await getClient(); // runs anvil
  const wallet = new Wallet(testAccounts[0]);
  const aaWalletAddress = await getCounterFactualAddress(wallet.address);

  describe("Unsafe mode", async () => {
    const { configUnsafe, networkConfigUnsafe } = await getConfigs();
    const { eth } = await getModules(configUnsafe, networkConfigUnsafe);

    it("Estimation should fails with AA21 error", async () => {
      const userOp = await createRandomUnsignedUserOp(wallet.address);
      await setBalance(userOp.sender, 0); // reset the balance
      const aaBalance = await client.getBalance(userOp.sender);
      expect(aaBalance.toHexString()).toEqual('0x00');
      try {
        await eth.estimateUserOperationGas({
          userOp,
          entryPoint: EntryPointAddress
        });
        expect.unreachable("Estimation should fail");
      } catch (err) {
        expect(err).toBeInstanceOf(Error);
      }
    });

    it("Simple transfer should pass through estimation", async () => {
      await setBalance(aaWalletAddress);
      const userOp = await createRandomUnsignedUserOp(wallet.address);
      const response: EstimatedUserOperationGas = await eth.estimateUserOperationGas({
        userOp,
        entryPoint: EntryPointAddress
      });
      expect(response).toBeDefined();
    });
  });
});
