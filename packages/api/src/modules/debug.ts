import { UserOperationStruct } from "types/lib/executor/contracts/EntryPoint";
import { Debug } from "executor/lib/modules";
import { IsEthereumAddress } from "class-validator";
import { BundlingMode } from "types/lib/api/interfaces";
import { GetStakeStatus } from "executor/lib/interfaces";
import { MempoolEntrySerialized } from "executor/lib/entities/interfaces";
import { RpcMethodValidator } from "../utils/RpcMethodValidator";
import {
  SetReputationArgs,
  SetReputationResponse,
} from "../dto/SetReputation.dto";
import { SetBundlingIntervalArgs } from "../dto/SetBundlingInterval.dto";
import { SetMempoolArgs } from "../dto/SetMempool.dto";
import { GetStakeStatusArgs } from "../dto/GetStakeStatus.dto";

export class DumpReputationArgs {
  @IsEthereumAddress()
  entryPoint!: string;
}

/*
  SPEC: https://eips.ethereum.org/EIPS/eip-4337#rpc-methods-debug-namespace
*/
export class DebugAPI {
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

  /*
   * Clears the bundler mempool
   */
  async clearMempool(): Promise<string> {
    return await this.debugModule.clearMempool();
  }

  /**
   * Dumps the current UserOperations mempool
   * array - Array of UserOperations currently in the mempool
   */
  async dumpMempool(): Promise<UserOperationStruct[]> {
    return await this.debugModule.dumpMempool();
  }

  async dumpMempoolRaw(): Promise<MempoolEntrySerialized[]> {
    return await this.debugModule.dumpMempoolRaw();
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
  @RpcMethodValidator(SetReputationArgs)
  async setReputation(args: SetReputationArgs): Promise<string> {
    return await this.debugModule.setReputation(args);
  }

  /**
   * Returns the reputation data of all observed addresses.
   * Returns an array of reputation objects, each with the fields described above in debug_bundler_setReputation with the
   * entryPoint - The entrypoint used by eth_sendUserOperation
   */
  @RpcMethodValidator(DumpReputationArgs)
  async dumpReputation(
    args: DumpReputationArgs
  ): Promise<SetReputationResponse> {
    return await this.debugModule.dumpReputation(args.entryPoint);
  }

  /**
   * Sets bundling interval. parameters:
   * interval - interval in seconds
   * returns "ok"
   */
  @RpcMethodValidator(SetBundlingIntervalArgs)
  async setBundlingInterval(args: SetBundlingIntervalArgs): Promise<string> {
    return await this.debugModule.setBundlingInterval(args.interval);
  }

  /**
   * Seeds the local mempool with the passed array. Parameters:
   * userOps - An array of UserOperations.
   * returns "ok"
   */
  @RpcMethodValidator(SetMempoolArgs)
  async setMempool(args: SetMempoolArgs): Promise<string> {
    return await this.debugModule.setMempool(args);
  }

  async getStakeStatus(args: GetStakeStatusArgs): Promise<GetStakeStatus> {
    return await this.debugModule.getStakeStatus(args.address, args.entryPoint);
  }
}
