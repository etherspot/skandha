import { IEntryPoint__factory } from "@skandha/types/lib/executor/contracts";
import { UserOperationStruct } from "@skandha/types/lib/executor/contracts/EntryPoint";
import { Contract, providers, constants } from "ethers";
import { Logger } from "@skandha/types/lib";
import { NetworkConfig, UserOpValidationResult } from "../../../interfaces";
import { nonGethErrorHandler, parseErrorResult } from "../utils";
import { getUserOpGasLimit } from "../../BundlingService/utils";

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

    const errorResult = await entryPointContract.callStatic
      .simulateValidation(userOp, {
        gasLimit,
      })
      .catch((e: any) => nonGethErrorHandler(entryPointContract, e));
    return parseErrorResult(userOp, errorResult);
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
    return parseErrorResult(userOp, {
      errorArgs: error.args,
      errorName: error.name,
    });
  }
}
