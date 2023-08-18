import { AddressZero, BytesZero } from "params/lib";
import RpcError from "types/lib/api/errors/rpc-error";
import { IEntryPoint__factory } from "types/lib/executor/contracts";
import { UserOperationStruct } from "types/lib/executor/contracts/EntryPoint";
import * as RpcErrorCodes from "types/lib/api/errors/rpc-error-codes";
import { providers } from "ethers";
import { nethermindErrorHandler } from "../utils";
import { ExecutionResult, Logger } from "../../../interfaces";

export class EstimationService {
  constructor(private provider: providers.Provider, private logger: Logger) {}

  async estimateUserOp(
    userOp: UserOperationStruct,
    entryPoint: string
  ): Promise<ExecutionResult> {
    const entryPointContract = IEntryPoint__factory.connect(
      entryPoint,
      this.provider
    );

    const tx = {
      to: entryPoint,
      data: entryPointContract.interface.encodeFunctionData(
        "simulateHandleOp",
        [userOp, AddressZero, BytesZero]
      ),
    };

    const errorResult = await entryPointContract.callStatic
      .simulateHandleOp(userOp, AddressZero, BytesZero)
      .catch((e: any) => nethermindErrorHandler(entryPointContract, e));

    if (errorResult.errorName === "FailedOp") {
      this.logger.debug(tx);
      throw new RpcError(
        errorResult.errorArgs.at(-1),
        RpcErrorCodes.VALIDATION_FAILED
      );
    }

    if (errorResult.errorName !== "ExecutionResult") {
      this.logger.debug(tx);
      throw errorResult;
    }

    return errorResult.errorArgs;
  }
}
