import { Logger } from "@skandha/types/lib/index.js";
import { UserOperation } from "@skandha/types/lib/contracts/UserOperation";
import { Address, PublicClient } from "viem";
import {
  ExecutionResultAndCallGasLimit,
  NetworkConfig,
  StateOverrides,
} from "../../../interfaces.js";
import { EntryPointService } from "../../EntryPointService/index.js";
import { mergeValidationDataValues } from "../../EntryPointService/utils/index.js";

export class EstimationService {
  constructor(
    private entryPointService: EntryPointService,
    private config: NetworkConfig,
    private publicClient: PublicClient,
    private logger: Logger
  ) {}

  async estimateUserOp(
    userOp: UserOperation,
    entryPoint: string,
    stateOverrides?: StateOverrides
  ): Promise<ExecutionResultAndCallGasLimit> {
    if (
      this.config.pimlicoSimulationsContract &&
      this.config.epSimulationsContract
    ) {
      return this.entryPointService.simulateHandleOpUsingSimulatorContracts(
        entryPoint as Address,
        userOp,
        stateOverrides
      );
    }
    const { returnInfo, callGasLimit } =
      await this.entryPointService.simulateHandleOp(
        entryPoint,
        userOp,
        stateOverrides
      );
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
