import { Logger } from "@skandha/types/lib";
import { UserOperation } from "@skandha/types/lib/contracts/UserOperation";
import { Address, getContract, PublicClient } from "viem";
import { ExecutionResultAndCallGasLimit, NetworkConfig, StateOverrides } from "../../../interfaces";
import { EntryPointService } from "../../EntryPointService";
import { mergeValidationDataValues, packUserOp } from "../../EntryPointService/utils";
import { _abi as epSimulationsAbi } from "@skandha/types/lib/contracts/EPv7/core/EpSimulations";
import { _abi as pimlicoSimulationsAbi } from "@skandha/types/lib/contracts/EPv7/core/PimlicoSimulations";

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
    if(this.config.pimlicoSimulationsContract && this.config.epSimulationsContract) {
      return this.entryPointService.simulateHandleOpUsingSimulatorContracts(
        entryPoint as Address,
        userOp,
        stateOverrides
      )
    }
    const { returnInfo, callGasLimit } =
      await this.entryPointService.simulateHandleOp(entryPoint, userOp, stateOverrides);
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
