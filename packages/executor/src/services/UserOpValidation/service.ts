import { BigNumber, providers } from "ethers";
import { Logger } from "types/lib";
import RpcError from "types/lib/api/errors/rpc-error";
import * as RpcErrorCodes from "types/lib/api/errors/rpc-error-codes";
import { UserOperation6And7 } from "types/lib/contracts/UserOperation";
import { Config } from "../../config";
import {
  ExecutionResult,
  NetworkConfig,
  UserOpValidationResult,
} from "../../interfaces";
import { ReputationService } from "../ReputationService";
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
    private provider: providers.Provider,
    private reputationService: ReputationService,
    private chainId: number,
    private config: Config,
    private logger: Logger
  ) {
    const networkConfig = config.getNetworkConfig();
    this.networkConfig = networkConfig;

    this.estimationService = new EstimationService(this.provider, this.logger);
    this.safeValidationService = new SafeValidationService(
      this.provider,
      this.reputationService,
      this.chainId,
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
    userOp: UserOperation6And7,
    entryPoint: string
  ): Promise<ExecutionResult> {
    return await this.estimationService.estimateUserOp(userOp, entryPoint);
  }

  async validateForEstimationWithSignature(
    userOp: UserOperation6And7,
    entryPoint: string
  ): Promise<UserOpValidationResult> {
    return await this.unsafeValidationService.validateUnsafely(
      userOp,
      entryPoint
    );
  }

  async simulateValidation(
    userOp: UserOperation6And7,
    entryPoint: string,
    codehash?: string
  ): Promise<UserOpValidationResult> {
    if (this.config.unsafeMode) {
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

  async validateGasFee(userOp: UserOperation6And7): Promise<boolean> {
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
}
