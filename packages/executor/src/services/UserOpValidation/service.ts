import { BigNumber, providers } from "ethers";
import { Logger } from "types/lib";
import { UserOperationStruct } from "types/lib/executor/contracts/EntryPoint";
import RpcError from "types/lib/api/errors/rpc-error";
import * as RpcErrorCodes from "types/lib/api/errors/rpc-error-codes";
import { Config } from "../../config";
import {
  ExecutionResult,
  NetworkConfig,
  UserOpValidationResult,
} from "../../interfaces";
import { ReputationService } from "../ReputationService";
import { Skandha } from "../../modules";
import {
  EstimationService,
  SafeValidationService,
  UnsafeValidationService,
} from "./validators";

export class UserOpValidationService {
  private networkConfig: NetworkConfig;

  private estimationService: EstimationService;
  private safeValidationService: SafeValidationService;
  private unsafeValidationService: UnsafeValidationService;

  constructor(
    private skandhaUtils: Skandha,
    private provider: providers.Provider,
    private reputationService: ReputationService,
    private chainId: number,
    private config: Config,
    private logger: Logger
  ) {
    const networkConfig = config.getNetworkConfig();
    this.networkConfig = networkConfig;

    this.estimationService = new EstimationService(
      this.provider,
      this.networkConfig,
      this.logger
    );
    this.safeValidationService = new SafeValidationService(
      this.skandhaUtils,
      this.provider,
      this.reputationService,
      this.chainId,
      this.config,
      this.networkConfig,
      this.logger
    );
    this.unsafeValidationService = new UnsafeValidationService(
      this.provider,
      this.networkConfig,
      this.logger
    );
  }

  async validateForEstimation(
    userOp: UserOperationStruct,
    entryPoint: string
  ): Promise<ExecutionResult> {
    if (this.networkConfig.entryPointForwarder.length > 2) {
      return await this.estimationService.estimateUserOpWithForwarder(
        userOp,
        entryPoint
      );
    }
    return await this.estimationService.estimateUserOp(userOp, entryPoint);
  }

  async validateForEstimationWithSignature(
    userOp: UserOperationStruct,
    entryPoint: string
  ): Promise<UserOpValidationResult> {
    if (this.networkConfig.entryPointForwarder.length > 2) {
      return await this.unsafeValidationService.validateUnsafelyWithForwarder(
        userOp,
        entryPoint
      );
    }
    return await this.unsafeValidationService.validateUnsafely(
      userOp,
      entryPoint
    );
  }

  async simulateValidation(
    userOp: UserOperationStruct,
    entryPoint: string,
    codehash?: string
  ): Promise<UserOpValidationResult> {
    if (this.config.unsafeMode) {
      if (this.networkConfig.entryPointForwarder.length > 2) {
        return await this.unsafeValidationService.validateUnsafelyWithForwarder(
          userOp,
          entryPoint
        );
      }
      return await this.unsafeValidationService.validateUnsafely(
        userOp,
        entryPoint
      );
    }
    return await this.safeValidationService.validateSafely(
      userOp,
      entryPoint,
      codehash
    );
  }

  async validateGasFee(userOp: UserOperationStruct): Promise<boolean> {
    const block = await this.provider.getBlock("latest");
    const { baseFeePerGas } = block;
    let { maxFeePerGas, maxPriorityFeePerGas } = userOp;
    maxFeePerGas = BigNumber.from(maxFeePerGas);
    maxPriorityFeePerGas = BigNumber.from(maxPriorityFeePerGas);
    if (!baseFeePerGas) {
      if (!maxFeePerGas.eq(maxPriorityFeePerGas)) {
        throw new RpcError(
          "maxFeePerGas must be equal to maxPriorityFeePerGas",
          RpcErrorCodes.INVALID_USEROP
        );
      }
      return true;
    }

    if (maxFeePerGas.lt(baseFeePerGas)) {
      throw new RpcError(
        "maxFeePerGas must be greater or equal to baseFee",
        RpcErrorCodes.INVALID_USEROP
      );
    }

    return true;
  }

  async binarySearchVGL(
    userOp: UserOperationStruct,
    entryPoint: string
  ): Promise<UserOperationStruct> {
    if (this.config.unsafeMode) {
      return this.estimationService.binarySearchVGL(userOp, entryPoint);
    }
    return this.estimationService.binarySearchVGLSafe(userOp, entryPoint);
  }

  async binarySearchCGL(
    userOp: UserOperationStruct,
    entryPoint: string
  ): Promise<UserOperationStruct> {
    if (this.config.unsafeMode) {
      return userOp; // CGL search not supported in unsafeMode
    }
    return this.estimationService.binarySearchCGLSafe(userOp, entryPoint);
  }
}
