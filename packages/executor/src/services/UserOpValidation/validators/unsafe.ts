import { IEntryPoint__factory } from "types/lib/executor/contracts";
import { UserOperationStruct } from "types/lib/executor/contracts/EntryPoint";
import { BigNumber, Contract, providers } from "ethers";
import { Logger } from "types/lib";
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
    return parseErrorResult(userOp, errorResult);
  }

  async validateUnsafelyWithForwarder(
    userOp: UserOperationStruct,
    entryPoint: string
  ): Promise<UserOpValidationResult> {
    const forwarderABI = ["function forward(address, bytes)"];
    const gasLimit = BigNumber.from(this.networkConfig.validationGasLimit).add(
      100000
    );
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
