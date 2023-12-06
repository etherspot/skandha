import {describe, it, expect} from "vitest";
import { ReputationService } from "../../../src/services";
import { utils } from "ethers";
import { randomAddress } from "../../utils/randomAddress";
import { ReputationStatus } from "types/src/executor";
import { LocalDbController } from "../../mocks";

describe("Reputation Service", () => {
  it("status of a fresh entry should be OK", async () => {
    const { reputationService } = prepareTest();
    const wallet = randomAddress();
    const status = await reputationService.getStatus(wallet.address);
    expect(status).toEqual(ReputationStatus.OK);
  })
});

function prepareTest() {
  const db = new LocalDbController("test");
  const reputationService = new ReputationService(
    db,
    1, // chainId
    10, // minInclusionDenominator
    10, // throttlingSlack
    50, // banSlack
    utils.parseEther("0.01"), // minStake
    1 // minUnstakeDelay
  );
  return { reputationService };
}
