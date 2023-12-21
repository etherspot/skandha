import { describe, it, expect } from "vitest";
import { getClient } from "../../fixtures";
import { ChainId, EntryPointAddress, SimpleFactoryAddress } from "../../constants";

describe("Initial check of test environment", async () => {
  const client = await getClient();

  it("Anvil should run", async () => {
    const chainId = (await client.getNetwork()).chainId;
    expect(chainId).toEqual(ChainId);
  });

  it("EntryPoint v0.6.0 should be deployed", async () => {
    const bytecode = await client.getCode(EntryPointAddress);
    expect(bytecode).toBeDefined();
    expect(bytecode?.length).toBeGreaterThan(2);
  });

  it("SimpleFactory should be deployed", async () => {
    const bytecode = await client.getCode(SimpleFactoryAddress);
    expect(bytecode).toBeDefined();
    expect(bytecode?.length).toBeGreaterThan(2);
  });
});
