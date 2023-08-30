import { AddressZero, BytesZero } from "params/lib";
import RpcError from "types/lib/api/errors/rpc-error";
import { IEntryPoint__factory } from "types/lib/executor/contracts";
import { UserOperationStruct } from "types/lib/executor/contracts/EntryPoint";
import { BundlerCollectorReturn, ExitInfo } from "types/lib/executor";
import * as RpcErrorCodes from "types/lib/api/errors/rpc-error-codes";
import { BigNumber, providers } from "ethers";
import { nethermindErrorHandler, parseValidationResult } from "../utils";
import { ExecutionResult, Logger } from "../../../interfaces";
import { GethTracer } from "../GethTracer";

const isVGLLow = (err: Error): boolean => {
  const { message } = err;
  if (!message) return false;
  return (
    message.indexOf("OOG") > -1 ||
    message.indexOf("AA40") > -1 ||
    message.indexOf("ogg.validation") > -1
  );
};

export class EstimationService {
  private gethTracer: GethTracer;

  constructor(private provider: providers.Provider, private logger: Logger) {
    this.gethTracer = new GethTracer(
      this.provider as providers.JsonRpcProvider
    );
  }

  async estimateUserOp(
    userOp: UserOperationStruct,
    entryPoint: string
  ): Promise<ExecutionResult> {
    const entryPointContract = IEntryPoint__factory.connect(
      entryPoint,
      this.provider
    );

    const errorResult = await entryPointContract.callStatic
      .simulateHandleOp(userOp, AddressZero, BytesZero)
      .catch((e: any) => nethermindErrorHandler(entryPointContract, e));

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

  // Binary search verificationGasLimit
  async binarySearchVGL(
    userOp: UserOperationStruct,
    entryPoint: string
  ): Promise<UserOperationStruct> {
    const { verificationGasLimit } = userOp;
    let [left, right] = [
      BigNumber.from(verificationGasLimit).div(2), // the estimated VGL doesn't differ that much from the actual VGL, so we can add some markup here
      BigNumber.from(verificationGasLimit),
    ];
    let lastOptimalVGL: BigNumber | undefined;
    while (left.lt(right)) {
      const mid = left.add(right).div(2);
      userOp.verificationGasLimit = mid;
      try {
        await this.estimateUserOp({ ...userOp, callGasLimit: 0 }, entryPoint);
        lastOptimalVGL = mid;
        break;
      } catch (err) {
        if (isVGLLow(err as Error)) {
          left = mid.add(1);
        } else {
          right = mid.sub(1);
        }
      }
    }

    userOp.verificationGasLimit = lastOptimalVGL || userOp.verificationGasLimit;
    return userOp;
  }

  async binarySearchVGLSafe(
    userOp: UserOperationStruct,
    entryPoint: string
  ): Promise<UserOperationStruct> {
    const { verificationGasLimit } = userOp;
    let [left, right] = [
      BigNumber.from(verificationGasLimit).div(2),
      BigNumber.from(verificationGasLimit),
    ];
    let lastOptimalVGL: BigNumber | undefined;
    while (left.lt(right)) {
      const mid = left.add(right).div(2);
      userOp.verificationGasLimit = mid;
      this.logger.debug(`mid: ${mid}`);
      try {
        await this.checkForOOG({ ...userOp, callGasLimit: 0 }, entryPoint);
        lastOptimalVGL = mid;
        break;
      } catch (err) {
        this.logger.debug(err);
        if (isVGLLow(err as Error)) {
          left = mid.add(1);
        } else {
          right = mid.sub(1);
        }
      }
    }

    userOp.verificationGasLimit = lastOptimalVGL || userOp.verificationGasLimit;
    return userOp;
  }

  async binarySearchCGLSafe(
    userOp: UserOperationStruct,
    entryPoint: string
  ): Promise<UserOperationStruct> {
    const { callGasLimit } = userOp;
    let [left, right] = [
      BigNumber.from(callGasLimit).div(5),
      BigNumber.from(callGasLimit),
    ];
    let lastOptimalCGL: BigNumber | undefined;
    while (left.lt(right)) {
      const mid = left.add(right).div(2);
      lastOptimalCGL = mid;
      try {
        await this.checkForOOG(userOp, entryPoint);
        lastOptimalCGL = mid;
      } catch (err) {
        this.logger.debug(err);
        if (isVGLLow(err as Error)) {
          left = mid.add(1);
        } else {
          right = mid.sub(1);
        }
      }
    }

    userOp.callGasLimit = lastOptimalCGL || userOp.callGasLimit;
    return userOp;
  }

  // Binary search callGasLimit
  async binarySearchCGL(
    userOp: UserOperationStruct,
    entryPoint: string
  ): Promise<UserOperationStruct> {
    const { callGasLimit } = userOp;
    let [left, right] = [
      BigNumber.from(callGasLimit).div(5), // the estimated CGL doesn't differ that much from the actual CGL, so we can add some markup here
      BigNumber.from(callGasLimit),
    ];
    let lastOptimalCGL: BigNumber | undefined;
    let retries = 2; // keep trying to find the most optimal value
    while (left.lt(right)) {
      const mid = left.add(right).div(2);
      userOp.callGasLimit = mid;
      try {
        await this.estimateUserOp(userOp, entryPoint);
        lastOptimalCGL = mid;
        right = mid.sub(1);
      } catch (err) {
        if (isVGLLow(err as Error)) {
          left = mid.add(1);
        } else {
          right = mid.sub(1);
        }
        if (lastOptimalCGL !== undefined && retries == 0) break;
        if (lastOptimalCGL !== undefined) {
          retries--;
        }
      }
    }

    userOp.callGasLimit = lastOptimalCGL || userOp.callGasLimit;
    return userOp;
  }

  async checkForOOG(
    userOp: UserOperationStruct,
    entryPoint: string
  ): Promise<string> {
    const entryPointContract = IEntryPoint__factory.connect(
      entryPoint,
      this.provider
    );

    const tx = {
      data: entryPointContract.interface.encodeFunctionData(
        "simulateHandleOp",
        [userOp, AddressZero, BytesZero]
      ),
      to: entryPoint,
    };

    const traceCall: BundlerCollectorReturn =
      await this.gethTracer.debug_traceCall(tx);
    const lastResult = traceCall.calls.at(-1) as ExitInfo;
    if (lastResult.type !== "REVERT") {
      throw new RpcError(
        "Invalid response. simulateCall must revert",
        RpcErrorCodes.VALIDATION_FAILED
      );
    }
    const data = (lastResult as ExitInfo).data;
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const validationResult = parseValidationResult(
      entryPointContract,
      userOp,
      data
    );

    traceCall.callsFromEntryPoint.forEach((currentLevel, index) => {
      if (currentLevel.oog) {
        if (index >= 1 && index < 3) {
          throw new Error("oog.validation");
        }
        if (index == 3) {
          throw new Error("oog.execution");
        }
      }
    });

    return "";
  }
}
