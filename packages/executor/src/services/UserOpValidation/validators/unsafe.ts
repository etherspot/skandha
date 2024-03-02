import { IEntryPoint__factory } from "types/lib/executor/contracts";
import { UserOperationStruct } from "types/lib/executor/contracts/EntryPoint";
import { BigNumber, providers } from "ethers";
import { Logger } from "types/lib";
import * as RpcErrorCodes from "types/lib/api/errors/rpc-error-codes";
import RpcError from "types/lib/api/errors/rpc-error";
import { NetworkConfig, UserOpValidationResult } from "../../../interfaces";
import { nonGethErrorHandler, parseErrorResult } from "../utils";

export class UnsafeValidationService {
  constructor(
    private provider: providers.Provider,
    private networkConfig: NetworkConfig,
    private logger: Logger
  ) {}

  async validateUnsafely(
    userOp: UserOperationStruct,
    entryPoint: string
  ): Promise<UserOpValidationResult> {
    const { validationGasLimit } = this.networkConfig;
    const entryPointContract = IEntryPoint__factory.connect(
      entryPoint,
      this.provider
    );
    const errorResult = await entryPointContract.callStatic
      .simulateValidation(userOp, {
        gasLimit: validationGasLimit,
      })
      .catch((e: any) => nonGethErrorHandler(entryPointContract, e));
    const validationResult = parseErrorResult(userOp, errorResult);

    const { returnInfo } = validationResult;

    const verificationCost = BigNumber.from(returnInfo.preOpGas).sub(
      userOp.preVerificationGas
    );
    const extraGas = BigNumber.from(userOp.verificationGasLimit)
      .sub(verificationCost)
      .toNumber();
    if (extraGas < 2000) {
      throw new RpcError(
        `verificationGas should have extra 2000 gas. has only ${extraGas}`,
        RpcErrorCodes.VALIDATION_FAILED
      );
    }

    return validationResult;
  }
}
