import { providers } from "ethers";
import { NetworkName } from "types/lib";
import { UserOperationStruct } from "types/lib/executor/contracts/EntryPoint";
import { Config } from "../../config";
import {
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
  ): Promise<any> {
    return this.estimationService.estimateUserOp(userOp, entryPoint);
  }

  async simulateValidation(
    userOp: UserOperationStruct,
    entryPoint: string,
    codehash?: string
  ): Promise<UserOpValidationResult> {
    if (this.config.unsafeMode) {
      return this.unsafeValidationService.validateUnsafely(userOp, entryPoint);
    }
    return this.safeValidationService.validateSafely(
      userOp,
      entryPoint,
      codehash
    );
  }
}
