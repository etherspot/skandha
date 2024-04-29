import { describe, it, expect, vi } from "vitest";
import { MempoolEntryStatus } from "types/src/executor";
import { UserOperationEventEvent } from "types/src/executor/contracts/EntryPoint";
import {
  getConfigs,
  getModules,
  getClient,
  getWallet,
  createSignedUserOp,
  getCounterFactualAddress,
} from "../../fixtures";
import { EntryPointAddress } from "../../constants";
import { setBalance } from "../../utils";

describe("Bundling Service", async () => {
  await getClient(); // runs anvil

  const {
    ethModule,
    networkConfigUnsafe,
    debugModule,
    mempoolService,
    eventsService,
  } = await prepareTest();
  describe("Unsafe mode", async () => {
    it.skip("Submitted bundle should contain configured number of userops", async () => {
      expect(networkConfigUnsafe.bundleInterval).toBeLessThan(300);
      const { bundleSize } = networkConfigUnsafe;
      const userOpHashes = [];
      for (let i = 0; i < bundleSize; ++i) {
        const wallet = await getWallet(i);
        const aaWallet = await getCounterFactualAddress(wallet.address);
        await setBalance(aaWallet);
        const userOp = await createSignedUserOp(ethModule, wallet);
        const hash = await ethModule.sendUserOperation({
          userOp,
          entryPoint: EntryPointAddress,
        });
        userOpHashes.push(hash);
      }
      expect(userOpHashes).toHaveLength(bundleSize);
      expect(await debugModule.dumpMempool()).toHaveLength(bundleSize);
      expect(await debugModule.sendBundleNow()).toBe("ok");

      const success = await new Promise((resolve) => {
        let trx: string | null = null;
        let foundEvents = 0;
        const callback = (...args: any[]): void => {
          const event = args[args.length - 1] as UserOperationEventEvent;
          if (trx == null) {
            trx = event.transactionHash;
          }
          if (trx != event.transactionHash) {
            eventsService.offUserOperationEvent(callback);
            resolve(false);
          }
          if (++foundEvents == bundleSize) {
            eventsService.offUserOperationEvent(callback);
            resolve(trx != null);
          }
        };
        eventsService.onUserOperationEvent(callback);
      });

      expect(success).toBeTruthy();
    });

    it("updates entry status after submitting userop", async () => {
      const wallet = await getWallet();
      const aaWallet = await getCounterFactualAddress(wallet.address);
      await setBalance(aaWallet);
      const userOp = await createSignedUserOp(ethModule, wallet);
      const hash = await ethModule.sendUserOperation({
        userOp,
        entryPoint: EntryPointAddress,
      });
      let entry = await mempoolService.getEntryByHash(hash);
      if (!entry) {
        return expect.unreachable("Could not find userop");
      }
      expect(
        entry.status === MempoolEntryStatus.New,
        "Invalid status. Must be New"
      ).toBeTruthy();

      await debugModule.sendBundleNow();

      const success = await new Promise((resolve) => {
        const callback = async (...args: any[]): Promise<void> => {
          eventsService.offUserOperationEvent(callback);
          entry = await mempoolService.getEntryByHash(hash);
          if (!entry) {
            return resolve(false);
          }
          expect(entry.status === MempoolEntryStatus.OnChain).toBeTruthy();
          expect(entry.actualTransaction).toEqual(entry.transaction);
          resolve(true);
        };
        eventsService.onUserOperationEvent(callback);
      });

      if (!success) {
        expect.unreachable("Could not find userop");
      }

      await mempoolService.deleteOldUserOps();
      expect(await mempoolService.getEntryByHash(hash)).not.toBeNull();
      vi.useFakeTimers();
      vi.advanceTimersByTime(2 * networkConfigUnsafe.archiveDuration * 1000);

      await mempoolService.deleteOldUserOps();
      expect(await mempoolService.getEntryByHash(hash)).toBeNull();
      vi.useRealTimers();
    });
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
