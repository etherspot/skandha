import { UserOperationStruct } from 'app/@types';
import RpcError from 'app/errors/rpc-error';
import * as RpcErrorCodes from 'app/bundler/rpc/error-codes';
import { BigNumberish, BytesLike, ethers, providers } from 'ethers';
import { extractAddrFromInitCode } from 'app/bundler/utils';
import { EntryPointContract } from 'app/bundler/contracts/EntryPoint';

interface StakeInfo {
  addr: string;
  stake: BigNumberish;
  unstakeDelaySec: BigNumberish;
}

interface ValidationResult {
  returnInfo: {
    preOpGas: BigNumberish
    prefund: BigNumberish
    deadline: number
  }

  senderInfo: StakeInfo
  factoryInfo: StakeInfo | undefined
  paymasterInfo?: StakeInfo | undefined
  aggregatorInfo?: StakeInfo | undefined
}

export class UserOpValidationService {
  constructor(private provider: providers.Provider) {}

  async callSimulateValidation(userOp: UserOperationStruct, entryPoint: string): Promise<ValidationResult> {
    const entryPointContract = new EntryPointContract(this.provider, entryPoint);
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
      let paymaster = errorResult.errorArgs.paymaster;
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
      returnInfo,
      senderInfo,
      factoryInfo,
      paymasterInfo,
      aggregatorInfo // may be missing (exists only SimulationResultWithAggregator
    } = errorResult.errorArgs;

    // extract address from 'data' (first 20 bytes)
    // add it as 'addr' member to the 'stakeinfo' struct
    // if no address, then return 'undefined' instead of struct.
    function fillEntity(
      data: BytesLike,
      info: StakeInfo
    ): StakeInfo | undefined {
      const addr = extractAddrFromInitCode(data);
      return addr == null
        ? undefined
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
      aggregatorInfo: fillEntity(
        aggregatorInfo?.actualAggregator,
        aggregatorInfo?.stakeInfo
      )
    };
  }
}
