import RpcError from "types/lib/api/errors/rpc-error";
import * as RpcErrorCodes from "types/lib/api/errors/rpc-error-codes";
import { providers } from "ethers";
import { Logger } from "types/lib";
import { UserOperation } from "types/lib/contracts/UserOperation";
import { ExecutionResult } from "../../../interfaces";
import { EntryPointService } from "../../EntryPointService";

export class EstimationService {
  constructor(
    private entryPointService: EntryPointService,
    private provider: providers.Provider,
    private logger: Logger
  ) {}

  async estimateUserOp(
    userOp: UserOperation,
    entryPoint: string
  ): Promise<ExecutionResult> {
    const errorResult = await this.entryPointService.simulateHandleOp(
      entryPoint,
      userOp
    );

    if (errorResult.errorName === "FailedOp") {
      throw new RpcError(
        errorResult.errorArgs.at(-1),
        RpcErrorCodes.VALIDATION_FAILED
      );
    }

    if (errorResult.errorName !== "ExecutionResult") {
      throw errorResult;
    }

    return errorResult.errorArgs;
  }
}
