import { UserOperationStruct } from 'app/@types';
import RpcError from 'app/errors/rpc-error';
import * as RpcErrorCodes from 'app/bundler/rpc/error-codes';
import { BigNumberish, ethers, providers } from 'ethers';
import { EntryPointContract } from 'app/bundler/contracts/EntryPoint';
import logger from 'app/logger';
import { GethTracer } from './GethTracer';

interface ValidationResult {
  preOpGas: BigNumberish
  prefund: BigNumberish
  deadline: number
}

export class UserOpValidationService {
  private gethTracer: GethTracer;

  constructor(
    private provider: providers.Provider,
  ) {
    this.gethTracer = new GethTracer(this.provider as providers.JsonRpcProvider);
  }

  async callSimulateValidation(userOp: UserOperationStruct, entryPoint: string): Promise<ValidationResult> {
    const entryPointContract = new EntryPointContract(this.provider, entryPoint);
    const errorResult = await entryPointContract
      .simulateValidation(userOp, { gasLimit: 10e6 })
      .catch((e: any) => e);
    return this.parseErrorResult(userOp, errorResult);
  }

  async simulateCompleteValidation(userOp: UserOperationStruct, entryPoint: string): Promise<ValidationResult> {
    const entryPointContract = new EntryPointContract(this.provider, entryPoint);
    const traceCall = await this.gethTracer.debug_traceCall({
      to: entryPoint,
      data: entryPointContract.encodeSimulateValidation(userOp)
    });
    const errorResult = await entryPointContract
      .simulateValidation(userOp, { gasLimit: 10e6 })
      .catch((e: any) => e);
    return this.parseErrorResult(userOp, errorResult);
  }

  parseErrorResult(
    userOp: UserOperationStruct,
    errorResult: { errorName: string; errorArgs: any }
  ): ValidationResult {
    if (!errorResult?.errorName?.startsWith('SimulationResult')) {
      // parse it as FailedOp
      // if its FailedOp, then we have the paymaster param... otherwise its an Error(string)
      let paymaster = errorResult.errorArgs?.paymaster;
      if (paymaster === ethers.constants.AddressZero) {
        paymaster = undefined;
      }
      // eslint-disable-next-line
      const msg: string =
        errorResult.errorArgs?.reason ?? errorResult.toString();

      if (paymaster == null) {
        throw new RpcError(
          `account validation failed: ${msg}`,
          RpcErrorCodes.VALIDATION_FAILED
        );
      } else {
        throw new RpcError(
          `paymaster validation failed: ${msg}`,
          RpcErrorCodes.REJECTED_BY_PAYMASTER,
          { paymaster }
        );
      }
    }

    const {
      preOpGas,
      prefund,
      deadline
    } = errorResult.errorArgs;

    return {
      preOpGas,
      prefund,
      deadline
    };
  }
}
