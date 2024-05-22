import { constants, BigNumber } from "ethers";
import { describe, it } from "vitest";
import { assert } from "chai";
import {
  getConfigs,
  getModules,
  getClient,
  getWallet,
  createSignedUserOp,
  getCounterFactualAddress,
} from "../../fixtures";
import { setBalance } from "../../utils";
import { getUserOpGasLimit } from "../../../src/services/BundlingService/utils";

describe("Get UserOperation gas limit", async () => {
  await getClient(); // runs anvil

  const { ethModule } = await prepareTest();

  it("returns estimationGasLimit is it's higher than userop's gas limit", async () => {
    const wallet = await getWallet();
    const aaWallet = await getCounterFactualAddress(wallet.address);
    await setBalance(aaWallet);
    const userOp = await createSignedUserOp(ethModule, wallet);
    const userOpGasLimit = getUserOpGasLimit(userOp);
    const customGasLimit = BigNumber.from(200_000_000);
    assert(
      userOpGasLimit.lt(customGasLimit),
      "userop gas limit should be lower"
    );
    assert(
      customGasLimit.eq(
        getUserOpGasLimit(userOp, constants.Zero, customGasLimit)
      ),
      "estimated gas limit should be higher"
    );
  });
});

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
async function prepareTest() {
  const { configUnsafe, networkConfigUnsafe } = await getConfigs();
  const {
    eth: ethModule,
    bundlingService: service,
    debug: debugModule,
    mempoolService,
    eventsService,
  } = await getModules(configUnsafe, networkConfigUnsafe);
  return {
    service,
    ethModule,
    networkConfigUnsafe,
    debugModule,
    mempoolService,
    eventsService,
  };
}
