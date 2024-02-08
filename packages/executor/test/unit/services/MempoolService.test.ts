import { describe, it, expect, vi } from "vitest";
import {
  createRandomUnsignedUserOp,
  getClient,
  getConfigs,
  getCounterFactualAddress,
  getModules,
  signUserOp,
  testAccounts
} from "../../fixtures";
import { Wallet, constants } from "ethers";
import { applyEstimatedUserOp, setBalance } from "../../utils";
import { EntryPointAddress, ZeroStakeInfo } from "../../constants";
import { Eth } from "../../../src/modules";
import { now } from "../../../src/utils";

describe("Mempool Service", async () => {
  await getClient();
  const { service, ethModule, networkConfig } = await prepareTest();
  const wallet = new Wallet(testAccounts[0]);
  const aaWalletAddress = await getCounterFactualAddress(wallet.address);

  it("Userop should be replaced after TTL without increasing fees", async () => {
    await setBalance(aaWalletAddress);
    const userOp = await createUserOp(ethModule, wallet);

    let timestamp = now();
    await service.addUserOp( userOp, EntryPointAddress, 0, ZeroStakeInfo, ZeroStakeInfo, ZeroStakeInfo, ZeroStakeInfo, constants.HashZero);
    try {
      await service.addUserOp( userOp, EntryPointAddress, 0, ZeroStakeInfo, ZeroStakeInfo, ZeroStakeInfo, ZeroStakeInfo, constants.HashZero);
      expect.unreachable("Validation should fail");
    } catch (err) {
      expect(err.message).toContain("fee too low");
    }
    try {
      vi.useFakeTimers();
      vi.setSystemTime(timestamp + networkConfig.useropsTTL * 1001); // after around ttl seconds passed we can replace with the same userop
      await service.addUserOp( userOp, EntryPointAddress, 0, ZeroStakeInfo, ZeroStakeInfo, ZeroStakeInfo, ZeroStakeInfo, constants.HashZero);
    } catch (err) {
      console.log(err);
      expect.unreachable("Validation should not fail");
    } finally {
      vi.useRealTimers();
    }
  });
});

async function prepareTest() {
  const { config, networkConfig } = await getConfigs();
  const { eth: ethModule, mempoolService: service } = await getModules(config, networkConfig);
  return { service, ethModule, networkConfig };
};

async function createUserOp(eth: Eth, wallet: Wallet) {
  let unsignedUserOp = await createRandomUnsignedUserOp(wallet.address);
  const response = await eth.estimateUserOperationGas({
    userOp: unsignedUserOp,
    entryPoint: EntryPointAddress
  });
  unsignedUserOp = applyEstimatedUserOp(unsignedUserOp, response);
  const userOp = await signUserOp(wallet, unsignedUserOp);
  return userOp;
}