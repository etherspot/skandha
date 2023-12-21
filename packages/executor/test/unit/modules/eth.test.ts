import { describe, expect, it } from "vitest";
import { Wallet, providers } from "ethers";
import { createRandomUnsignedUserOp, getClient, getConfigs, getCounterFactualAddress, getModules, getWallet, testAccounts } from "../../fixtures";
import { topUpAccount } from "../../utils";
import { DefaultRpcUrl, EntryPointAddress } from "../../constants";
import { EstimatedUserOperationGas } from "types/src/api/interfaces";

describe("Eth module", async () => {
  const client = await getClient(); // runs anvil
  const wallet = new Wallet(testAccounts[0]);
  const aaWalletAddress = await getCounterFactualAddress(wallet.address);

  describe("Unsafe mode", async () => {
    const provider = new providers.JsonRpcProvider(DefaultRpcUrl);
    const { configUnsafe, networkConfigUnsafe } = await getConfigs();
    const { eth } = await getModules(configUnsafe, networkConfigUnsafe);

    it("Estimation should fails with AA21 error", async () => {
      const userOp = await createRandomUnsignedUserOp(wallet.address);
      await client.send("anvil_setBalance", [userOp.sender, 0]); // reset the balance of aa wallet
      const aaBalance = await provider.getBalance(userOp.sender);
      expect(aaBalance.toNumber()).toEqual(0);
      try {
        const response: EstimatedUserOperationGas = await eth.estimateUserOperationGas({
          userOp,
          entryPoint: EntryPointAddress
        });
        expect.unreachable("Estimation should fail");
      } catch (err) {
        expect(err).toBeInstanceOf(Error);
        expect(err.message).toContain("AA21 didn't pay prefund");
        expect(err.code).toEqual(-32500);
      }
    });

    it("Simple transfer should pass through estimation", async () => {
      await topUpAccount(aaWalletAddress);
      const userOp = await createRandomUnsignedUserOp(wallet.address);
      const response: EstimatedUserOperationGas = await eth.estimateUserOperationGas({
        userOp,
        entryPoint: EntryPointAddress
      });
      expect(response).toBeDefined();
    });
  });
});
