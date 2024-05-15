import RpcError from "@skandha/types/lib/api/errors/rpc-error";
import * as RpcErrorCodes from "@skandha/types/lib/api/errors/rpc-error-codes";
import { providers } from "ethers";
import { Logger } from "@skandha/types/lib";
import { UserOperation } from "@skandha/types/lib/contracts/UserOperation";
import { ExecutionResult } from "../../../interfaces";
import { EntryPointService } from "../../EntryPointService";
import { mergeValidationDataValues } from "../../EntryPointService/utils";

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
    const returnInfo = await this.entryPointService.simulateHandleOp(
      entryPoint,
      userOp
    );
    const { validAfter, validUntil } = mergeValidationDataValues(
      returnInfo.accountValidationData,
      returnInfo.paymasterValidationData
    )
    return {
      preOpGas: returnInfo.preOpGas,
      paid: returnInfo.paid,
      validAfter: validAfter,
      validUntil: validUntil,
      targetSuccess: returnInfo.targetSuccess,
      targetResult: returnInfo.targetResult,
    }
  }
}
