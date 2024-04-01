import { AddressZero, BytesZero } from "params/lib";
import RpcError from "types/lib/api/errors/rpc-error";
import { IEntryPoint__factory } from "types/lib/executor/contracts";
import { UserOperationStruct } from "types/lib/executor/contracts/EntryPoint";
import { BundlerCollectorReturn, ExitInfo } from "types/lib/executor";
import * as RpcErrorCodes from "types/lib/api/errors/rpc-error-codes";
import { BigNumber, Contract, providers } from "ethers";
import { Logger } from "types/lib";
import { nonGethErrorHandler } from "../utils";
import { ExecutionResult, NetworkConfig } from "../../../interfaces";
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

const isCGLLow = (err: Error): boolean => {
  const { message } = err;
  if (!message) return false;
  return (
    message.indexOf("OOG") > -1 ||
    message.indexOf("AA40") > -1 ||
    message.indexOf("ogg.execution") > -1
  );
};

export class EstimationService {
  private gethTracer: GethTracer;

  constructor(
    private provider: providers.Provider,
    private networkConfig: NetworkConfig,
    private logger: Logger
  ) {
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

    const gasLimit = BigNumber.from(userOp.callGasLimit)
      .add(userOp.verificationGasLimit)
      .add(userOp.preVerificationGas)
      .add(5000); // markup added by EP

    const errorResult = await entryPointContract.callStatic
      .simulateHandleOp(userOp, AddressZero, BytesZero, {
        gasLimit,
      })
      .catch((e: any) => nonGethErrorHandler(entryPointContract, e));

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

  async estimateUserOpWithForwarder(
    userOp: UserOperationStruct,
    entryPoint: string
  ): Promise<ExecutionResult> {
    const forwarderABI = ["function forward(address, bytes) returns (bytes)"];
    const entryPointContract = IEntryPoint__factory.connect(
      entryPoint,
      this.provider
    );

    const gasLimit = BigNumber.from(userOp.callGasLimit)
      .add(userOp.verificationGasLimit)
      .add(userOp.preVerificationGas)
      .add(105000);

    const simulateData = entryPointContract.interface.encodeFunctionData(
      "simulateHandleOp",
      [userOp, AddressZero, BytesZero]
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
        simulateData,
      ]),
      gasLimit,
    });

    const error = entryPointContract.interface.parseError(data);
    if (error.name === "FailedOp") {
      throw new RpcError(error.args.at(-1), RpcErrorCodes.VALIDATION_FAILED);
    }

    if (error.name !== "ExecutionResult") {
      throw error;
    }

    return error.args as any;
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
      try {
        await this.estimateUserOp(
          { ...userOp, verificationGasLimit: mid },
          entryPoint
        );
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
      try {
        await this.checkForOOG(
          { ...userOp, verificationGasLimit: mid },
          entryPoint
        );
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

  // Binary search callGasLimit
  // Only available in safe mode
  async binarySearchCGLSafe(
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
        await this.checkForOOG(userOp, entryPoint);
        lastOptimalCGL = mid;
        right = mid.sub(1);
      } catch (err) {
        if (isCGLLow(err as Error)) {
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
    const { name: errorName, args: errorArgs } =
      entryPointContract.interface.parseError(data);
    const errFullName = `${errorName}(${errorArgs.toString()})`;
    if (!errorName?.startsWith("ExecutionResult")) {
      throw new Error(errFullName);
    }

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

    return ""; // successful validation
  }
}
