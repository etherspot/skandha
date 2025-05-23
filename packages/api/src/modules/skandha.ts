import { Eth } from "@skandha/executor/lib/modules/eth";
import {
  GetConfigResponse,
  GetFeeHistoryResponse,
  GetGasPriceResponse,
  UserOperationStatus,
} from "@skandha/types/lib/api/interfaces";
import { Skandha } from "@skandha/executor/lib/modules";
import RpcError from "@skandha/types/lib/api/errors/rpc-error";
import * as RpcErrorCodes from "@skandha/types/lib/api/errors/rpc-error-codes";
import { RpcMethodValidator } from "../utils/RpcMethodValidator";
import { FeeHistoryArgs } from "../dto/FeeHistory.dto";

export class SkandhaAPI {
  constructor(private ethModule: Eth, private skandhaModule: Skandha) {}

  /**
   * @params hash hash of a userop
   * @returns status
   */
  async getUserOperationStatus(hash: string): Promise<UserOperationStatus> {
    return this.skandhaModule.getUserOperationStatus(hash);
  }

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
    return await this.skandhaModule.getFeeHistory(
      args.entryPoint,
      args.blockCount,
      args.newestBlock
    );
  }

  async getGasPrice(): Promise<GetGasPriceResponse> {
    return await this.skandhaModule.getGasPrice();
  }

  async getConfig(): Promise<GetConfigResponse> {
    return await this.skandhaModule.getConfig();
  }
}
