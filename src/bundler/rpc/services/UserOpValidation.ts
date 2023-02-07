import { UserOperationStruct } from 'app/@types';
import RpcError from 'app/errors/rpc-error';
import * as RpcErrorCodes from 'app/bundler/rpc/error-codes';
import { BigNumberish, BytesLike, ethers, providers } from 'ethers';
import { GethTracer } from './GethTracer';
import { getAddr } from 'app/bundler/utils';
import { ReputationService } from './ReputationService';
import { EntryPoint__factory } from 'app/bundler/contracts/factories';

export interface ReferencedCodeHashes {
  // addresses accessed during this user operation
  addresses: string[]
  // keccak over the code of all referenced addresses
  hash: string
}

export interface UserOpValidationResult {
  returnInfo: {
    preOpGas: BigNumberish
    prefund: BigNumberish
    deadline: number
  }

  senderInfo: StakeInfo
  factoryInfo: StakeInfo | null
  paymasterInfo: StakeInfo | null
  aggregatorInfo: StakeInfo | null
  referencedContracts?: ReferencedCodeHashes
}

export interface StakeInfo {
  addr: string
  stake: BigNumberish
  unstakeDelaySec: BigNumberish
}

export class UserOpValidationService {
  private gethTracer: GethTracer;

  constructor(
    private provider: providers.Provider,
    private reputationService: ReputationService
  ) {
    this.gethTracer = new GethTracer(this.provider as providers.JsonRpcProvider);
  }

  async callSimulateValidation(userOp: UserOperationStruct, entryPoint: string): Promise<UserOpValidationResult> {
    const entryPointContract = EntryPoint__factory.connect(entryPoint, this.provider);
    const errorResult = await entryPointContract
      .callStatic
      .simulateValidation(userOp, { gasLimit: 10e6 })
      .catch((e: any) => e);
    return this.parseErrorResult(userOp, errorResult);
  }

  async simulateCompleteValidation(userOp: UserOperationStruct, entryPoint: string): Promise<UserOpValidationResult> {
    const entryPointContract = EntryPoint__factory.connect(entryPoint, this.provider);
    const traceCall = await this.gethTracer.debug_traceCall({
      to: entryPoint,
      data: entryPointContract.interface.encodeFunctionData('simulateValidation', [userOp])
    });
    // TOOD: add codehash fetching
    // TODO: make sure that the call call reverts
    // TODO: restrict calling EntryPoint methods except fallback and depositTo if depth > 2
    for (let address of Object.keys(traceCall)) {
      let violation = traceCall[address]?.violation || {};
      if (Object.keys(violation).length > 0) {
        throw new RpcError('UserOp contains banned OPCODE', RpcErrorCodes.INVALID_OPCODE);
      }
      let value = traceCall[address]?.value || 0;
      if (value > 0 && entryPoint.toLowerCase() !== address.toLocaleLowerCase()) {
        throw new RpcError('May not may CALL with value', RpcErrorCodes.INVALID_OPCODE);
      }
    }
    const errorResult = await entryPointContract
      .callStatic
      .simulateValidation(userOp, { gasLimit: 10e6 })
      .catch((e: any) => e);
    const validationResult = this.parseErrorResult(userOp, errorResult);
    // const stakeInfoEntities = {
    //   factory: validationResult.factoryInfo,
    //   account: validationResult.senderInfo,
    //   paymaster: validationResult.paymasterInfo
    // };
    if (
      validationResult.returnInfo.deadline != null ||
      validationResult.returnInfo.deadline + 30 >= Date.now() / 1000
    ) {
      throw new RpcError('expires too soon', RpcErrorCodes.USEROP_EXPIRED);
    }

    if (validationResult.aggregatorInfo) {
      const stakeErr = await this.reputationService.checkStake(validationResult.aggregatorInfo);
      if (stakeErr) {
        throw new RpcError(stakeErr, RpcErrorCodes.VALIDATION_FAILED);
      }
    }

    return {
      ...validationResult
    };
  }

  parseErrorResult(
    userOp: UserOperationStruct,
    errorResult: { errorName: string; errorArgs: any }
  ): UserOpValidationResult {
    if (!errorResult?.errorName?.startsWith('ValidationResult')) {
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
          msg,
          RpcErrorCodes.VALIDATION_FAILED
        );
      } else {
        throw new RpcError(
          msg,
          RpcErrorCodes.REJECTED_BY_PAYMASTER,
          { paymaster }
        );
      }
    }

    const {
      returnInfo,
      senderInfo,
      factoryInfo,
      paymasterInfo,
      aggregatorInfo // may be missing (exists only SimulationResultWithAggregator
    } = errorResult.errorArgs;

    // extract address from "data" (first 20 bytes)
    // add it as "addr" member to the "stakeinfo" struct
    // if no address, then return "undefined" instead of struct.
    function fillEntity (data: BytesLike, info: StakeInfo): StakeInfo | null {
      const addr = getAddr(data);
      return addr == null
        ? null
        : {
            ...info,
            addr
          };
    }

    return {
      returnInfo,
      senderInfo: {
        ...senderInfo,
        addr: userOp.sender
      },
      factoryInfo: fillEntity(userOp.initCode, factoryInfo),
      paymasterInfo: fillEntity(userOp.paymasterAndData, paymasterInfo),
      aggregatorInfo: fillEntity(aggregatorInfo?.actualAggregator, aggregatorInfo?.stakeInfo)
    };
  }
}
