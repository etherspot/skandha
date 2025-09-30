import { Logger } from "@skandha/types/lib/index.js";
import RpcError from "@skandha/types/lib/api/errors/rpc-error.js";
import * as RpcErrorCodes from "@skandha/types/lib/api/errors/rpc-error-codes.js";
import {
  Eip7702Auth,
  UserOperation,
} from "@skandha/types/lib/contracts/UserOperation";
import { verifyAuthorization } from "viem/utils";
import { Hex, PublicClient } from "viem";
import { Config } from "../../config.js";
import {
  ExecutionResultAndCallGasLimit,
  NetworkConfig,
  SimulateHandleOpResultAndGasLimits,
  StateOverrides,
  UserOpValidationResult,
} from "../../interfaces.js";
import { ReputationService } from "../ReputationService.js";
import { EntryPointService } from "../EntryPointService/index.js";
import { Skandha } from "../../modules/index.js";
import {
  EstimationService,
  SafeValidationService,
  UnsafeValidationService,
} from "./validators/index.js";
import { MempoolService } from "../MempoolService/index.js";

export class UserOpValidationService {
  private networkConfig: NetworkConfig;

  private estimationService: EstimationService;
  private safeValidationService: SafeValidationService;
  private unsafeValidationService: UnsafeValidationService;

  constructor(
    private skandhaUtils: Skandha,
    private publicClient: PublicClient,
    private entryPointService: EntryPointService,
    private reputationService: ReputationService,
    private mempoolService: MempoolService,
    private chainId: number,
    private config: Config,
    private logger: Logger
  ) {
    const networkConfig = config.getNetworkConfig();
    this.networkConfig = networkConfig;

    this.estimationService = new EstimationService(
      this.entryPointService,
      this.networkConfig,
      this.publicClient,
      this.logger
    );
    this.safeValidationService = new SafeValidationService(
      this.skandhaUtils,
      this.publicClient,
      this.entryPointService,
      this.reputationService,
      this.mempoolService,
      this.chainId,
      this.networkConfig,
      this.logger
    );
    this.unsafeValidationService = new UnsafeValidationService(
      this.entryPointService,
      this.publicClient,
      this.networkConfig,
      this.chainId,
      this.logger
    );
  }

  async validateForEstimation(
    userOp: UserOperation,
    entryPoint: string,
    stateOverrides?: StateOverrides
  ): Promise<
    ExecutionResultAndCallGasLimit | SimulateHandleOpResultAndGasLimits
  > {
    return await this.estimationService.estimateUserOp(
      userOp,
      entryPoint,
      stateOverrides
    );
  }

  async validateForEstimationWithSignature(
    userOp: UserOperation,
    entryPoint: string
  ): Promise<UserOpValidationResult> {
    return await this.unsafeValidationService.validateUnsafely(
      userOp,
      entryPoint
    );
  }

  async simulateValidation(
    userOp: UserOperation,
    entryPoint: Hex,
    codehash?: string
  ): Promise<UserOpValidationResult> {
    if (this.config.unsafeMode) {
      return await this.unsafeValidationService.validateUnsafely(
        userOp,
        entryPoint
      );
    }
    return await this.safeValidationService
      .validateSafely(userOp, entryPoint, codehash)
      .catch((error) => {
        if (
          !(error instanceof RpcError) &&
          error.message === "debug_traceCall_failed"
        ) {
          this.logger.debug(
            "Error occurred during userOp validation on safe mode"
          );
          this.logger.debug("Validating userOp using unsafe mode...");

          return this.unsafeValidationService.validateUnsafely(
            userOp,
            entryPoint
          );
        }
        throw error;
      });
  }

  async validateGasFee(userOp: UserOperation): Promise<boolean> {
    const block = await this.publicClient.getBlock({ blockTag: "latest" });
    const { baseFeePerGas } = block;
    let { maxFeePerGas, maxPriorityFeePerGas } = userOp;
    maxFeePerGas = BigInt(maxFeePerGas);
    maxPriorityFeePerGas = BigInt(maxPriorityFeePerGas);
    if (baseFeePerGas == null) {
      if (!(maxFeePerGas === maxPriorityFeePerGas)) {
        throw new RpcError(
          "maxFeePerGas must be equal to maxPriorityFeePerGas",
          RpcErrorCodes.INVALID_USEROP
        );
      }
      return true;
    }

    if (maxFeePerGas < baseFeePerGas) {
      throw new RpcError(
        "maxFeePerGas must be greater or equal to baseFee",
        RpcErrorCodes.INVALID_USEROP
      );
    }

    return true;
  }

  async validateEip7702Auth(
    sender: string,
    eip7702Auth: Eip7702Auth
  ): Promise<boolean> {
    const { chainId, nonce, r, s, yParity, address } = eip7702Auth;
    if (
      !(BigInt(this.chainId) === BigInt(chainId)) &&
      !(BigInt(0) === BigInt(chainId))
    ) {
      throw new RpcError(
        "Invalid chainid in eip7702Auth",
        RpcErrorCodes.INVALID_USEROP
      );
    }

    return await verifyAuthorization({
      address: sender as unknown as `0x${string}`,
      authorization: {
        chainId: Number(BigInt(chainId)),
        nonce: Number(BigInt(nonce)),
        address,
        r: r,
        s: s,
        yParity: BigInt(yParity) === BigInt(0) ? 0 : 1,
      },
    });
  }
}
