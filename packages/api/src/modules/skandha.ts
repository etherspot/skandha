import { Eth } from "executor/lib/modules/eth";
import {
  GetFeeHistoryResponse,
  GetGasPriceResponse,
} from "types/lib/api/interfaces";
import { Skandha } from "executor/lib/modules";
import RpcError from "types/lib/api/errors/rpc-error";
import * as RpcErrorCodes from "types/lib/api/errors/rpc-error-codes";
import { RpcMethodValidator } from "../utils/RpcMethodValidator";
import { SendUserOperationGasArgs } from "../dto/SendUserOperation.dto";
import { FeeHistoryArgs } from "../dto/FeeHistory.dto";

export class SkandhaAPI {
  constructor(private ethModule: Eth, private skandhaModule: Skandha) {}

  /**
   * Validates UserOp. If the UserOp (sender + entryPoint + nonce) match the existing UserOp in mempool,
   * validates if new UserOp can replace the old one (gas fees must be higher by at least 10%)
   * @param userOp same as eth_sendUserOperation
   * @param entryPoint Entry Point
   * @returns
   */
  @RpcMethodValidator(SendUserOperationGasArgs)
  async validateUserOp(args: SendUserOperationGasArgs): Promise<boolean> {
    return await this.ethModule.validateUserOp(args);
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
}
