import { BigNumber, ethers } from 'ethers';
import {
  EstimatedUserOperationGas,
  UserOperationByHashResponse,
  UserOperationReceipt,
  UserOperationStruct,
  EstimateUserOperationGasArgs
} from 'app/@types';
import { RpcMethodValidator } from '../decorators';
import RpcError from 'app/errors/rpc-error';
import * as RpcErrorCodes from '../error-codes';
import { arrayify, hexlify } from 'ethers/lib/utils';
import { packUserOp } from 'app/bundler/utils';
import { UserOpValidationService } from '../services';

export class Eth {
  private userOpValidationService: UserOpValidationService;

  constructor(
    private provider: ethers.providers.Provider
  ) {
    this.userOpValidationService = new UserOpValidationService(this.provider);
  }

  /**
   * 
   * @param userOp a full user-operation struct. All fields MUST be set as hex values. empty bytes block (e.g. empty initCode) MUST be set to "0x"
   * @param entryPoint the entrypoint address the request should be sent through. this MUST be one of the entry points returned by the supportedEntryPoints rpc call.
   */
  async sendUserOperation(
    userOp: UserOperationStruct,
    entryPoint: string
  ): Promise<string> {
    const validationResult = this.userOpValidationService
      .callSimulateValidation(userOp, entryPoint);
    // TODO: add user op in mempool
    return 'ok';
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
    const { userOp, entryPoint } = args;
    if (!this.validateEntryPoint(entryPoint)) {
      throw new RpcError('Invalid Entrypoint', RpcErrorCodes.INVALID_REQUEST);
    }
    const userOpComplemented: UserOperationStruct = {
      ...userOp,
      paymasterAndData: '0x',
      maxFeePerGas: 0,
      maxPriorityFeePerGas: 0,
      preVerificationGas: 0,
      verificationGasLimit: 10e6
    };
    const { preOpGas } = await this.userOpValidationService
      .callSimulateValidation(userOpComplemented, entryPoint);
    const callGasLimit = await this.provider.estimateGas({
      from: entryPoint,
      to: userOp.sender,
      data: userOp.callData
    }).then(b => b.toNumber()).catch(err => {
      const message = err.message.match(/reason="(.*?)"/)?.at(1) ?? 'execution reverted';
      throw new RpcError(message, RpcErrorCodes.VALIDATION_FAILED);
    });
    const preVerificationGas = this.calcPreVerificationGas(userOp);
    const verificationGasLimit = BigNumber.from(preOpGas).toNumber();
    return {
      preVerificationGas,
      verificationGasLimit,
      callGasLimit
    };
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
    return null;
  }

  /**
   * 
   * @param hash user op hash
   * @returns a UserOperation receipt
   */
  async getUserOperationReceipt(
    hash: string
  ): Promise<UserOperationReceipt | null> {
    return null;
  }

  /**
   * eth_chainId
   * @returns EIP-155 Chain ID.
   */
  async getChainId(): Promise<number> {
    return (await this.provider.getNetwork()).chainId;
  }

  /**
   * Returns an array of the entryPoint addresses supported by the client
   * The first element of the array SHOULD be the entryPoint addresses preferred by the client.
   * @returns Entry points
   */
  async getSupportedEntryPoints(): Promise<string[]> {
    return [];
  }

  private validateEntryPoint(entryPoint: string): boolean {
    return true;
  }

  static DefaultGasOverheads = {
    fixed: 21000,
    perUserOp: 18300,
    perUserOpWord: 4,
    zeroByte: 4,
    nonZeroByte: 16,
    bundleSize: 1,
    sigSize: 65
  };
  
  /**
   * calculate the preVerificationGas of the given UserOperation
   * preVerificationGas (by definition) is the cost overhead that can't be calculated on-chain.
   * it is based on parameters that are defined by the Ethereum protocol for external transactions.
   * @param userOp filled userOp to calculate. The only possible missing fields can be the signature and preVerificationGas itself
   * @param overheads gas overheads to use, to override the default values
   */
  private calcPreVerificationGas (userOp: Partial<UserOperationStruct>, overheads?: Partial<typeof Eth.DefaultGasOverheads>): number {
    const ov = { ...Eth.DefaultGasOverheads, ...(overheads ?? {}) };
    const p: UserOperationStruct = {
      // dummy values, in case the UserOp is incomplete.
      preVerificationGas: 21000, // dummy value, just for calldata cost
      signature: hexlify(Buffer.alloc(ov.sigSize, 1)), // dummy signature
      ...userOp
    } as any;
  
    const packed = arrayify(packUserOp(p, false));
    const callDataCost = packed.map(x => x === 0 ? ov.zeroByte : ov.nonZeroByte).reduce((sum, x) => sum + x);
    const ret = Math.round(
      callDataCost +
      ov.fixed / ov.bundleSize +
      ov.perUserOp +
      ov.perUserOpWord * packed.length
    );
    return ret;
  }
  
}
