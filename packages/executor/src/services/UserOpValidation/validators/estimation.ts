import { Logger } from "@skandha/types/lib";
import { UserOperation } from "@skandha/types/lib/contracts/UserOperation";
import { PublicClient } from "viem";
import { ExecutionResultAndCallGasLimit } from "../../../interfaces";
import { EntryPointService } from "../../EntryPointService";
import { mergeValidationDataValues } from "../../EntryPointService/utils";

export class EstimationService {
  constructor(
    private entryPointService: EntryPointService,
    private publicClient: PublicClient,
    private logger: Logger
  ) {}

  async estimateUserOp(
    userOp: UserOperation,
    entryPoint: string
  ): Promise<ExecutionResultAndCallGasLimit> {
    const { returnInfo, callGasLimit } =
      await this.entryPointService.simulateHandleOp(entryPoint, userOp);
    const { validAfter, validUntil } = mergeValidationDataValues(
      returnInfo.accountValidationData,
      returnInfo.paymasterValidationData
    );
    return {
      returnInfo: {
        preOpGas: returnInfo.preOpGas,
        paid: returnInfo.paid,
        validAfter: validAfter,
        validUntil: validUntil,
        targetSuccess: returnInfo.targetSuccess,
        targetResult: returnInfo.targetResult,
      },
      callGasLimit,
    };
  }
}
