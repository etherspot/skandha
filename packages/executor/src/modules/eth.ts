import { BigNumber, BigNumberish, ethers } from "ethers";
import RpcError from "@skandha/types/lib/api/errors/rpc-error";
import * as RpcErrorCodes from "@skandha/types/lib/api/errors/rpc-error-codes";
import {
  EstimatedUserOperationGas,
  UserOperationByHashResponse,
  UserOperationReceipt,
} from "@skandha/types/lib/api/interfaces";
import { IPVGEstimator } from "@skandha/params/lib/types/IPVGEstimator";
import {
  estimateOptimismPVG,
  estimateArbitrumPVG,
  ECDSA_DUMMY_SIGNATURE,
  estimateMantlePVG,
  AddressZero,
  serializeMempoolId,
  estimateAncient8PVG,
} from "@skandha/params/lib";
import { Logger } from "@skandha/types/lib";
import { PerChainMetrics } from "@skandha/monitoring/lib";
import { UserOperation } from "@skandha/types/lib/contracts/UserOperation";
import { UserOperationStruct } from "@skandha/types/lib/contracts/EPv6/EntryPoint";
import {
  UserOpValidationService,
  MempoolService,
  EntryPointService,
} from "../services";
import { GetNodeAPI, NetworkConfig } from "../interfaces";
import { EntryPointVersion } from "../services/EntryPointService/interfaces";
import {
  EstimateUserOperationGasArgs,
  SendUserOperationGasArgs,
} from "./interfaces";
import { Skandha } from "./skandha";

export class Eth {
  private pvgEstimator: IPVGEstimator | null = null;

  constructor(
    private chainId: number,
    private provider: ethers.providers.JsonRpcProvider,
    private entryPointService: EntryPointService,
    private userOpValidationService: UserOpValidationService,
    private mempoolService: MempoolService,
    private skandhaModule: Skandha,
    private config: NetworkConfig,
    private logger: Logger,
    private metrics: PerChainMetrics | null,
    private getNodeAPI: GetNodeAPI = () => null
  ) {
    // ["arbitrum", "arbitrumNova"]
    if ([42161, 42170].includes(this.chainId)) {
      this.pvgEstimator = estimateArbitrumPVG(this.provider);
    }

    // ["optimism", "optimismGoerli"]
    if ([10, 420].includes(this.chainId)) {
      this.pvgEstimator = estimateOptimismPVG(this.provider);
    }

    // mantle
    if ([5000, 5001].includes(this.chainId)) {
      this.pvgEstimator = estimateMantlePVG(this.provider);
    }

    if ([888888888].includes(this.chainId)) {
      this.pvgEstimator = estimateAncient8PVG(this.provider);
    }
  }

  /**
   *
   * @param userOp a full user-operation struct. All fields MUST be set as hex values. empty bytes block (e.g. empty initCode) MUST be set to "0x"
   * @param entryPoint the entrypoint address the request should be sent through. this MUST be one of the entry points returned by the supportedEntryPoints rpc call.
   */
  async sendUserOperation(args: SendUserOperationGasArgs): Promise<string> {
    const userOp = args.userOp as unknown as UserOperation;
    const entryPoint = args.entryPoint.toLowerCase();
    if (!this.validateEntryPoint(entryPoint)) {
      throw new RpcError("Invalid Entrypoint", RpcErrorCodes.INVALID_REQUEST);
    }
    await this.mempoolService.validateUserOpReplaceability(userOp, entryPoint);

    this.logger.debug("Validating user op before sending to mempool...");
    await this.userOpValidationService.validateGasFee(userOp);
    const validationResult =
      await this.userOpValidationService.simulateValidation(userOp, entryPoint);
    // TODO: fetch aggregator
    this.logger.debug(
      "Opcode validation successful. Trying saving in mempool..."
    );

    const userOpHash = await this.entryPointService.getUserOpHash(
      entryPoint,
      userOp
    );
    await this.mempoolService.addUserOp(
      userOp,
      entryPoint,
      validationResult.returnInfo.prefund,
      validationResult.senderInfo,
      validationResult.factoryInfo,
      validationResult.paymasterInfo,
      validationResult.aggregatorInfo,
      userOpHash,
      validationResult.referencedContracts?.hash
    );
    this.logger.debug("Saved in mempool");

    this.metrics?.useropsInMempool.inc();

    try {
      if (
        this.entryPointService.getEntryPointVersion(entryPoint) ===
        EntryPointVersion.SIX
      ) {
        const nodeApi = this.getNodeAPI();
        if (nodeApi) {
          const { canonicalEntryPoint, canonicalMempoolId } = this.config;
          if (
            canonicalEntryPoint.toLowerCase() == entryPoint.toLowerCase() &&
            canonicalMempoolId.length > 0
          ) {
            const blockNumber = await this.provider.getBlockNumber(); // TODO: fetch blockNumber from simulateValidation
            await nodeApi.publishVerifiedUserOperationJSON(
              entryPoint,
              userOp as UserOperationStruct,
              blockNumber.toString(),
              serializeMempoolId(canonicalMempoolId)
            );
            this.metrics?.useropsSent?.inc();
          }
        }
      }
    } catch (err) {
      this.logger.debug(`Could not send userop over gossipsub: ${err}`);
    }
    return userOpHash;
  }

  /**
   * Estimate the gas values for a UserOperation. Given UserOperation optionally without gas limits and gas prices, return the needed gas limits.
   * The signature field is ignored by the wallet, so that the operation will not require user’s approval.
   * Still, it might require putting a “semi-valid” signature (e.g. a signature in the right length)
   * @param userOp same as eth_sendUserOperation gas limits (and prices) parameters are optional, but are used if specified
   * maxFeePerGas and maxPriorityFeePerGas default to zero
   * @param entryPoint Entry Point
   * @returns
   */
  async estimateUserOperationGas(
    args: EstimateUserOperationGasArgs
  ): Promise<EstimatedUserOperationGas> {
    const userOp = args.userOp;
    const entryPoint = args.entryPoint.toLowerCase();
    if (!this.validateEntryPoint(entryPoint)) {
      throw new RpcError("Invalid Entrypoint", RpcErrorCodes.INVALID_REQUEST);
    }

    const userOpComplemented: UserOperation = {
      ...userOp,
      callGasLimit: BigNumber.from(10e6),
      preVerificationGas: BigNumber.from(1e6),
      verificationGasLimit: BigNumber.from(10e6),
      maxFeePerGas: 1,
      maxPriorityFeePerGas: 1,
    };

    if (userOpComplemented.signature.length <= 2) {
      userOpComplemented.signature = ECDSA_DUMMY_SIGNATURE;
    }

    const returnInfo = await this.userOpValidationService.validateForEstimation(
      userOpComplemented,
      entryPoint
    );

    // eslint-disable-next-line prefer-const
    let { preOpGas, validAfter, validUntil, paid } = returnInfo;

    const verificationGasLimit = BigNumber.from(preOpGas)
      .sub(userOpComplemented.preVerificationGas)
      .mul(130)
      .div(100) // 130% markup
      .toNumber();

    let preVerificationGas: BigNumberish =
      this.entryPointService.calcPreverificationGas(
        entryPoint,
        userOpComplemented
      );
    userOpComplemented.preVerificationGas = preVerificationGas;
    let callGasLimit: BigNumber = BigNumber.from(0);

    // calculate callGasLimit based on paid fee
    const { estimationStaticBuffer } = this.config;
    callGasLimit = BigNumber.from(paid).div(userOpComplemented.maxFeePerGas);
    callGasLimit = callGasLimit.sub(preOpGas).add(estimationStaticBuffer || 0);

    if (callGasLimit.lt(0)) {
      callGasLimit = BigNumber.from(estimationStaticBuffer || 0);
    }

    //< checking for execution revert
    await this.provider
      .estimateGas({
        from: entryPoint,
        to: userOp.sender,
        data: userOp.callData,
      })
      .catch((err) => {
        const message =
          err.message.match(/reason="(.*?)"/)?.at(1) ?? "execution reverted";
        throw new RpcError(message, RpcErrorCodes.EXECUTION_REVERTED);
      });
    //>

    // Binary search gas limits
    const userOpToEstimate: UserOperation = {
      ...userOpComplemented,
      preVerificationGas,
      verificationGasLimit,
      callGasLimit,
    };

    const gasFee = await this.skandhaModule.getGasPrice();

    if (this.pvgEstimator) {
      userOpComplemented.maxFeePerGas = gasFee.maxFeePerGas;
      userOpComplemented.maxPriorityFeePerGas = gasFee.maxPriorityFeePerGas;
      const data = this.entryPointService.encodeHandleOps(
        entryPoint,
        [userOpComplemented],
        AddressZero
      );
      preVerificationGas = await this.pvgEstimator(
        entryPoint,
        data,
        preVerificationGas,
        {
          contractCreation: Boolean(
            userOp.factory && userOp.factory.length > 2
          ),
          userOp: userOpComplemented,
        }
      );
    }

    this.metrics?.useropsEstimated.inc();

    return {
      preVerificationGas,
      verificationGasLimit: userOpToEstimate.verificationGasLimit,
      verificationGas: userOpToEstimate.verificationGasLimit,
      validAfter: validAfter ? BigNumber.from(validAfter) : undefined,
      validUntil: validUntil ? BigNumber.from(validUntil) : undefined,
      callGasLimit: userOpToEstimate.callGasLimit,
      maxFeePerGas: gasFee.maxFeePerGas,
      maxPriorityFeePerGas: gasFee.maxPriorityFeePerGas,
    };
  }

  /**
   * Estimates userop gas and validates the signature
   * @param args same as in sendUserOperation
   */
  async estimateUserOperationGasWithSignature(
    args: SendUserOperationGasArgs
  ): Promise<EstimatedUserOperationGas> {
    const userOp = args.userOp;
    const entryPoint = args.entryPoint.toLowerCase();
    if (!this.validateEntryPoint(entryPoint)) {
      throw new RpcError("Invalid Entrypoint", RpcErrorCodes.INVALID_REQUEST);
    }

    const { returnInfo } =
      await this.userOpValidationService.validateForEstimationWithSignature(
        userOp,
        entryPoint
      );
    const { preOpGas, validAfter, validUntil } = returnInfo;
    const callGasLimit = await this.provider
      .estimateGas({
        from: entryPoint,
        to: userOp.sender,
        data: userOp.callData,
      })
      .then((b) => b.toNumber())
      .catch((err) => {
        const message =
          err.message.match(/reason="(.*?)"/)?.at(1) ?? "execution reverted";
        throw new RpcError(message, RpcErrorCodes.EXECUTION_REVERTED);
      });

    const verificationGasLimit = BigNumber.from(preOpGas).toNumber();

    const gasFee = await this.skandhaModule.getGasPrice();

    return {
      preVerificationGas: this.entryPointService.calcPreverificationGas(
        entryPoint,
        userOp
      ),
      verificationGasLimit,
      verificationGas: verificationGasLimit,
      validAfter: BigNumber.from(validAfter),
      validUntil: BigNumber.from(validUntil),
      callGasLimit,
      maxFeePerGas: gasFee.maxFeePerGas,
      maxPriorityFeePerGas: gasFee.maxPriorityFeePerGas,
    };
  }

  /**
   * Validates UserOp. If the UserOp (sender + entryPoint + nonce) match the existing UserOp in mempool,
   * validates if new UserOp can replace the old one (gas fees must be higher by at least 10%)
   * @param userOp same as eth_sendUserOperation
   * @param entryPoint Entry Point
   * @returns
   */
  async validateUserOp(args: SendUserOperationGasArgs): Promise<boolean> {
    const userOp = args.userOp;
    const entryPoint = args.entryPoint.toLowerCase();
    if (!this.validateEntryPoint(entryPoint)) {
      throw new RpcError("Invalid Entrypoint", RpcErrorCodes.INVALID_REQUEST);
    }
    await this.mempoolService.validateUserOpReplaceability(userOp, entryPoint);
    this.logger.debug(
      JSON.stringify(
        await this.userOpValidationService.simulateValidation(
          userOp,
          entryPoint
        ),
        undefined,
        2
      )
    );
    return true;
  }

  /**
   *
   * @param hash user op hash
   * @returns null in case the UserOperation is not yet included in a block, or a full UserOperation,
   * with the addition of entryPoint, blockNumber, blockHash and transactionHash
   */
  async getUserOperationByHash(
    hash: string
  ): Promise<UserOperationByHashResponse | null> {
    return this.entryPointService.getUserOperationByHash(hash);
  }

  /**
   *
   * @param hash user op hash
   * @returns a UserOperation receipt
   */
  async getUserOperationReceipt(
    hash: string
  ): Promise<UserOperationReceipt | null> {
    return this.entryPointService.getUserOperationReceipt(hash);
  }

  /**
   * eth_chainId
   * @returns EIP-155 Chain ID.
   */
  async getChainId(): Promise<number> {
    if (this.chainId == null) {
      this.chainId = (await this.provider.getNetwork()).chainId;
    }
    return this.chainId;
  }

  /**
   * Returns an array of the entryPoint addresses supported by the client
   * The first element of the array SHOULD be the entryPoint addresses preferred by the client.
   * @returns Entry points
   */
  async getSupportedEntryPoints(): Promise<string[]> {
    return this.entryPointService.getSupportedEntryPoints();
  }

  validateEntryPoint(entryPoint: string): boolean {
    return this.entryPointService.isEntryPointSupported(entryPoint);
  }
}
