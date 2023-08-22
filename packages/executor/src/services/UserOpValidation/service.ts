import { BigNumber, providers } from "ethers";
import { NetworkName } from "types/lib";
import { UserOperationStruct } from "types/lib/executor/contracts/EntryPoint";
import RpcError from "types/lib/api/errors/rpc-error";
import * as RpcErrorCodes from "types/lib/api/errors/rpc-error-codes";
import { Config } from "../../config";
import {
  ExecutionResult,
  Logger,
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
    private network: NetworkName,
    private config: Config,
    private logger: Logger
  ) {
    const networkConfig = config.getNetworkConfig(network);
    if (!networkConfig) {
      throw new Error(`No config found for ${network}`);
    }
    this.networkConfig = networkConfig;

    this.estimationService = new EstimationService(this.provider, this.logger);
    this.safeValidationService = new SafeValidationService(
      this.provider,
      this.reputationService,
      this.network,
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
    return await this.estimationService.estimateUserOp(userOp, entryPoint);
  }

  async validateForEstimationWithSignature(
    userOp: UserOperationStruct,
    entryPoint: string
  ): Promise<UserOpValidationResult> {
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
}
