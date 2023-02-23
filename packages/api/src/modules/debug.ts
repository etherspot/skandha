import { UserOperationStruct } from "types/lib/relayer/contracts/EntryPoint";
import { Debug } from "relayer/lib/modules";
import { IsEthereumAddress } from "class-validator";
import { BundlingMode } from "types/lib/api/interfaces";
import { RpcMethodValidator } from "../utils/RpcMethodValidator";

export class DumpReputationArgs {
  @IsEthereumAddress()
  entryPoint!: string;
}

/*
  SPEC: https://eips.ethereum.org/EIPS/eip-4337#rpc-methods-debug-namespace
*/
export class DebugAPI {
  bundlingMode: BundlingMode = "auto";

  constructor(private debugModule: Debug) {}

  /**
   * Sets bundling mode.
   * After setting mode to “manual”, an explicit call to debug_bundler_sendBundleNow is required to send a bundle.
   */
  async setBundlingMode(mode: BundlingMode): Promise<string> {
    return this.debugModule.setBundlingMode(mode);
  }

  /**
   * Clears the bundler mempool and reputation data of paymasters/accounts/factories/aggregators
   */
  async clearState(): Promise<string> {
    return await this.debugModule.clearState();
  }

  /**
   * Dumps the current UserOperations mempool
   * array - Array of UserOperations currently in the mempool
   */
  async dumpMempool(): Promise<UserOperationStruct[]> {
    return await this.debugModule.dumpMempool();
  }

  /**
   * Forces the bundler to build and execute a bundle from the mempool as handleOps() transaction
   */
  async sendBundleNow(): Promise<string> {
    return await this.debugModule.sendBundleNow();
  }

  /**
   * Sets reputation of given addresses. parameters:
   * An array of reputation entries to add/replace, with the fields:
   * reputations - An array of reputation entries to add/replace, with the fields:
   *        address - The address to set the reputation for.
   *        opsSeen - number of times a user operations with that entity was seen and added to the mempool
   *        opsIncluded - number of times a user operations that uses this entity was included on-chain
   *        status? - (string) The status of the address in the bundler ‘ok’
   * entryPoint the entrypoint used by eth_sendUserOperation
   */
  async setReputation(): Promise<string> {
    return "ok";
  }

  /**
   * Returns the reputation data of all observed addresses.
   * Returns an array of reputation objects, each with the fields described above in debug_bundler_setReputation with the
   * entryPoint - The entrypoint used by eth_sendUserOperation
   */
  @RpcMethodValidator(DumpReputationArgs)
  async dumpReputation(): Promise<[]> {
    return [];
  }
}
