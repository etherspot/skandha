import { IEntryPoint__factory } from "@skandha/types/lib/executor/contracts";
import { UserOperationStruct } from "@skandha/types/lib/executor/contracts/EntryPoint";
import { Contract, providers, constants } from "ethers";
import { Logger } from "@skandha/types/lib";
import * as RpcErrorCodes from "@skandha/types/lib/api/errors/rpc-error-codes";
import RpcError from "@skandha/types/lib/api/errors/rpc-error";
import { NetworkConfig, UserOpValidationResult } from "../../../interfaces";
import { nonGethErrorHandler, parseErrorResult } from "../utils";
import { getUserOpGasLimit } from "../../BundlingService/utils";
import { TenderlyValidationService } from "./tenderly";

export class UnsafeValidationService {
  private tenderlyValidationService: TenderlyValidationService | null = null;
  constructor(
    private provider: providers.Provider,
    private chainId: number,
    private networkConfig: NetworkConfig,
    private logger: Logger
  ) {
    if (networkConfig.tenderlyKey && networkConfig.tenderlyApiUrl) {
      this.tenderlyValidationService = new TenderlyValidationService(
        networkConfig.tenderlyApiUrl,
        networkConfig.tenderlyKey,
        networkConfig.tenderlySave,
        chainId,
        logger
      );
    }
  }

  async validateUnsafely(
    userOp: UserOperationStruct,
    entryPoint: string
  ): Promise<UserOpValidationResult> {
    const entryPointContract = IEntryPoint__factory.connect(
      entryPoint,
      this.provider
    );

    const gasLimit = this.networkConfig.gasFeeInSimulation
      ? getUserOpGasLimit(
          userOp,
          constants.Zero,
          this.networkConfig.estimationGasLimit
        )
      : undefined;

    let errorResult;

    if (this.tenderlyValidationService) {
      errorResult = await this.tenderlyValidationService.validate(
        userOp,
        entryPointContract,
        gasLimit
      );
    } else {
      errorResult = await entryPointContract.callStatic
        .simulateValidation(userOp, {
          gasLimit,
        })
        .catch((e: any) => nonGethErrorHandler(entryPointContract, e));
    }

    const result = parseErrorResult(userOp, errorResult, false);

    const { returnInfo } = result;
    if (returnInfo.sigFailed) {
      throw new RpcError(
        "Invalid UserOp signature or paymaster signature",
        RpcErrorCodes.INVALID_SIGNATURE
      );
    }

    const now = Math.floor(Date.now() / 1000);
    if (returnInfo.validUntil != null && returnInfo.validUntil < now) {
      throw new RpcError("already expired", RpcErrorCodes.USEROP_EXPIRED);
    }

    return result;
  }

  async validateUnsafelyWithForwarder(
    userOp: UserOperationStruct,
    entryPoint: string
  ): Promise<UserOpValidationResult> {
    const forwarderABI = ["function forward(address, bytes)"];
    const entryPointContract = IEntryPoint__factory.connect(
      entryPoint,
      this.provider
    );
    const validationData = entryPointContract.interface.encodeFunctionData(
      "simulateValidation",
      [userOp]
    );

    const forwarder = new Contract(
      this.networkConfig.entryPointForwarder,
      forwarderABI,
      this.provider
    );

    const gasLimit = this.networkConfig.gasFeeInSimulation
      ? getUserOpGasLimit(
          userOp,
          constants.Zero,
          this.networkConfig.estimationGasLimit
        )
      : undefined;

    const data = await this.provider.call({
      to: this.networkConfig.entryPointForwarder,
      data: forwarder.interface.encodeFunctionData("forward", [
        entryPoint,
        validationData,
      ]),
      gasLimit,
    });
    const error = entryPointContract.interface.parseError(data);
    return parseErrorResult(
      userOp,
      {
        errorArgs: error.args,
        errorName: error.name,
      },
      false
    );
  }
}
