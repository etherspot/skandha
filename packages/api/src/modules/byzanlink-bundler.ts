import { Eth } from "@byzanlink-bundler/executor/lib/modules/eth";
import {
  GetConfigResponse,
  GetFeeHistoryResponse,
  GetGasPriceResponse,
  UserOperationStatus,
} from "@byzanlink-bundler/types/lib/api/interfaces";
import { ByzanlinkBundler } from "@byzanlink-bundler/executor/lib/modules";
import RpcError from "@byzanlink-bundler/types/lib/api/errors/rpc-error";
import * as RpcErrorCodes from "@byzanlink-bundler/types/lib/api/errors/rpc-error-codes";
import { RpcMethodValidator } from "../utils/RpcMethodValidator";
import { FeeHistoryArgs } from "../dto/FeeHistory.dto";

export class ByzanBundlerAPI {
  constructor(private ethModule: Eth, private byzanlinkbundlerModule: ByzanlinkBundler) {}

  /**
   * @param entryPoint Entry Point
   * @param useropCount Number of blocks in the requested range
   * @param newestBlock Highest number block of the requested range, or "latest"
   * @returns
   */
  @RpcMethodValidator(FeeHistoryArgs)
  async getFeeHistory(args: FeeHistoryArgs): Promise<GetFeeHistoryResponse> {
    if (!this.ethModule.validateEntryPoint(args.entryPoint)) {
      throw new RpcError("Invalid Entrypoint", RpcErrorCodes.INVALID_REQUEST);
    }
    return await this.byzanlinkbundlerModule.getFeeHistory(
      args.entryPoint,
      args.blockCount,
      args.newestBlock
    );
  }

  /**
   * @params hash hash of a userop
   * @returns status
   */
  async getUserOperationStatus(hash: string): Promise<UserOperationStatus> {
    return this.byzanlinkbundlerModule.getUserOperationStatus(hash);
  }

  async getGasPrice(): Promise<GetGasPriceResponse> {
    return await this.byzanlinkbundlerModule.getGasPrice();
  }

  async getConfig(): Promise<GetConfigResponse> {
    return await this.byzanlinkbundlerModule.getConfig();
  }

  // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
  async getPeers() {
    return await this.byzanlinkbundlerModule.getPeers();
  }
}
