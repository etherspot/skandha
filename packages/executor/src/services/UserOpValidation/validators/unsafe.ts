import { IEntryPoint__factory } from "types/lib/executor/contracts";
import { UserOperationStruct } from "types/lib/executor/contracts/EntryPoint";
import { providers } from "ethers";
import {
  Logger,
  NetworkConfig,
  UserOpValidationResult,
} from "../../../interfaces";
import { nethermindErrorHandler, parseErrorResult } from "../utils";

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
      .catch((e: any) => nethermindErrorHandler(entryPointContract, e));
    return parseErrorResult(userOp, errorResult);
  }
}
