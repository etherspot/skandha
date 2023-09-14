import { Eth } from "executor/lib/modules/eth";
import {
  EstimatedUserOperationGas,
  UserOperationByHashResponse,
  UserOperationReceipt,
} from "types/lib/api/interfaces";
import { RpcMethodValidator } from "../utils/RpcMethodValidator";
import { SendUserOperationGasArgs } from "../dto/SendUserOperation.dto";
import { EstimateUserOperationGasArgs } from "../dto/EstimateUserOperation.dto";

export class EthAPI {
  constructor(private ethModule: Eth) {}

  /**
   *
   * @param userOp a full user-operation struct. All fields MUST be set as hex values. empty bytes block (e.g. empty initCode) MUST be set to "0x"
   * @param entryPoint the entrypoint address the request should be sent through. this MUST be one of the entry points returned by the supportedEntryPoints rpc call.
   */
  @RpcMethodValidator(SendUserOperationGasArgs)
  async sendUserOperation(args: SendUserOperationGasArgs): Promise<string> {
    return await this.ethModule.sendUserOperation(args);
  }

  /**
   * @params args sama as in sendUserOperation
   */
  async estimateUserOpGasAndValidateSignature(
    args: SendUserOperationGasArgs
  ): Promise<EstimatedUserOperationGas> {
    return await this.ethModule.estimateUserOperationGasWithSignature(args);
  }

  /**
   * Estimate the gas values for a UserOperation. Given UserOperation optionally without gas limits and gas prices, return the needed gas limits.
   * The signature field is ignored by the wallet, so that the operation will not require user’s approval.
   * Still, it might require putting a “semi-valid” signature (e.g. a signature in the right length)
   * @param userOp same as eth_sendUserOperation gas limits (and prices) parameters are optional, but are used if specified
   * maxFeePerGas and maxPriorityFeePerGas default to zero
   * @param entryPoint Entry Point
   * @returns
   */
  @RpcMethodValidator(EstimateUserOperationGasArgs)
  async estimateUserOperationGas(
    args: EstimateUserOperationGasArgs
  ): Promise<EstimatedUserOperationGas> {
    return await this.ethModule.estimateUserOperationGas(args);
  }

  /**
   *
   * @param hash user op hash
   * @returns null in case the UserOperation is not yet included in a block, or a full UserOperation,
   * with the addition of entryPoint, blockNumber, blockHash and transactionHash
   */
  async getUserOperationByHash(
    hash: string
  ): Promise<UserOperationByHashResponse | null> {
    return await this.ethModule.getUserOperationByHash(hash);
  }

  /**
   *
   * @param hash user op hash
   * @returns a UserOperation receipt
   */
  async getUserOperationReceipt(
    hash: string
  ): Promise<UserOperationReceipt | null> {
    return await this.ethModule.getUserOperationReceipt(hash);
  }

  /**
   * eth_chainId
   * @returns EIP-155 Chain ID.
   */
  async getChainId(): Promise<number> {
    return await this.ethModule.getChainId();
  }

  /**
   * Returns an array of the entryPoint addresses supported by the client
   * The first element of the array SHOULD be the entryPoint addresses preferred by the client.
   * @returns Entry points
   */
  async getSupportedEntryPoints(): Promise<string[]> {
    return await this.ethModule.getSupportedEntryPoints();
  }
}
