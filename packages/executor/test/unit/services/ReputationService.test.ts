import {describe, it, expect} from "vitest";
import { ReputationStatus } from "types/src/executor";
import { randomAddress } from "../../utils";
import { getClient, getConfigs, getServices } from "../../fixtures";

describe("Reputation Service", async () => {
  await getClient();
  it("status of a fresh entry should be OK", async () => {
    const { service } = await prepareTest();
    const wallet = randomAddress();
    const status = await service.getStatus(wallet.address);
    expect(status).toEqual(ReputationStatus.OK);
  });
});

async function prepareTest() {
  const { config, networkConfig } = await getConfigs();
  const { reputationService: service } = await getServices(config, networkConfig);
  return { service };
};
