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
} from "@skandha/params/lib";
import { Logger } from "@skandha/types/lib";
import { PerChainMetrics } from "@skandha/monitoring/lib";
import { UserOperation } from "@skandha/types/lib/contracts/UserOperation";
import { UserOperationStruct } from "@skandha/types/lib/contracts/EPv6/EntryPoint";
import { MempoolEntryStatus } from "@skandha/types/lib/executor";
import { BlockscoutAPI } from "@skandha/utils/lib/third-party";
import {
  UserOpValidationService,
  MempoolService,
  EntryPointService,
} from "../services";
import { GetNodeAPI, NetworkConfig } from "../interfaces";
import { EntryPointVersion } from "../services/EntryPointService/interfaces";
import { getUserOpGasLimit } from "../services/BundlingService/utils";
import { maxBn, minBn } from "../utils/bignumber";
import { hexlifyUserOp } from "../utils/hexlifyUserop";
import {
  EstimateUserOperationGasArgs,
  SendUserOperationGasArgs,
} from "./interfaces";
import { Skandha } from "./skandha";

export class Eth {
  private pvgEstimator: IPVGEstimator | null = null;
  private blockscoutApi: BlockscoutAPI | null = null;

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

    // ["optimism", "optimismGoerli", "base", "ancient8"]
    if ([10, 420, 8453, 888888888].includes(this.chainId)) {
      this.pvgEstimator = estimateOptimismPVG(this.provider);
    }

    // mantle, mantle testnet, mantle sepolia
    if ([5000, 5001, 5003].includes(this.chainId)) {
      this.pvgEstimator = estimateMantlePVG(this.provider);
    }

    if (this.config.blockscoutUrl) {
      this.blockscoutApi = new BlockscoutAPI(
        this.provider,
        this.logger,
        this.config.blockscoutUrl,
        this.config.blockscoutApiKeys
      );
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

    if (userOp.eip7702Auth) {
      const valid = await this.userOpValidationService.validateEip7702Auth(
        userOp.sender,
        userOp.eip7702Auth
      );

      if (!valid) {
        throw new RpcError(
          "Invalid sender for provided EIP7702 Auth",
          RpcErrorCodes.INVALID_USEROP
        );
      }

      const currentNonce = await this.provider.getTransactionCount(
        userOp.sender
      );

      if (
        !BigNumber.from(currentNonce).eq(
          BigNumber.from(userOp.eip7702Auth.nonce)
        )
      ) {
        throw new RpcError(
          "Invalid sender nonce in eip7702Auth",
          RpcErrorCodes.VALIDATION_FAILED
        );
      }
      await this.mempoolService.validateEip7702(
        userOp.sender,
        userOp.eip7702Auth.address
      );
    }

    await this.mempoolService.validateUserOpReplaceability(userOp, entryPoint);

    this.logger.debug("Validating user op before sending to mempool...");
    if (getUserOpGasLimit(userOp).gt(this.config.userOpGasLimit)) {
      throw new RpcError(
        "UserOp's gas limit is too high",
        RpcErrorCodes.INVALID_USEROP
      );
    }
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
        EntryPointVersion.SEVEN
      ) {
        const nodeApi = this.getNodeAPI();
        if (nodeApi) {
          const { canonicalEntryPoint, canonicalMempoolId } = this.config;
          if (
            validationResult.belongsToCanonicalMempool &&
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
    const { userOp: partialUserOp, entryPoint } = args;
    if (!this.validateEntryPoint(entryPoint)) {
      throw new RpcError("Invalid Entrypoint", RpcErrorCodes.INVALID_REQUEST);
    }

    const userOp: UserOperation = {
      ...partialUserOp,
      callGasLimit: BigNumber.from(10e6),
      preVerificationGas: BigNumber.from(1e6),
      verificationGasLimit: BigNumber.from(10e6),
      maxFeePerGas: 1,
      maxPriorityFeePerGas: 1,
    };

    if (this.chainId == 80002) {
      userOp.callGasLimit = BigNumber.from(20e6);
      userOp.preVerificationGas = BigNumber.from(50000);
      userOp.verificationGasLimit = BigNumber.from(3e6);
    }

    if (userOp.signature.length <= 2) {
      userOp.signature = ECDSA_DUMMY_SIGNATURE;
    }

    // eslint-disable-next-line prefer-const
    let { returnInfo, callGasLimit: binarySearchCGL } =
      await this.userOpValidationService.validateForEstimation(
        userOp,
        entryPoint
      );

    // eslint-disable-next-line prefer-const
    let { preOpGas, validAfter, validUntil, paid } = returnInfo;

    const verificationGasLimit = BigNumber.from(preOpGas)
      .sub(userOp.preVerificationGas)
      .mul(10000 + this.config.vglMarkupPercent)
      .div(10000) // % markup
      .add(this.config.vglMarkup)
      .toNumber();

    const { cglMarkup } = this.config;
    // calculate callGasLimit based on paid fee
    const totalGas: BigNumber = BigNumber.from(paid).div(userOp.maxFeePerGas);
    const paidFeeCGL = totalGas.sub(preOpGas);

    //< checking for execution revert
    const ethEstimateGas = await this.provider
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

    let callGasLimit = minBn(binarySearchCGL, paidFeeCGL);
    // check between binary search & paid fee cgl
    if (userOp.factoryData !== undefined && userOp.factoryData.length <= 2) {
      await this.provider
        .estimateGas({
          from: entryPoint,
          to: userOp.sender,
          data: userOp.callData,
          gasLimit: callGasLimit,
        })
        .catch((_) => {
          callGasLimit = maxBn(binarySearchCGL, paidFeeCGL);
        });
    }

    // check between eth_estimateGas & binary search & paid fee cgl
    if (userOp.factoryData !== undefined && userOp.factoryData.length <= 2) {
      const prevCGL = callGasLimit;
      callGasLimit = minBn(ethEstimateGas, callGasLimit);
      await this.provider
        .estimateGas({
          from: entryPoint,
          to: userOp.sender,
          data: userOp.callData,
          gasLimit: callGasLimit,
        })
        .catch((_) => {
          callGasLimit = maxBn(callGasLimit, prevCGL);
        });
    }

    callGasLimit = callGasLimit
      .mul(10000 + this.config.cglMarkupPercent) // % markup
      .div(10000)
      .add(cglMarkup || 0);

    this.logger.debug(
      {
        callGasLimit,
        paidFeeCGL,
        binarySearchCGL,
        ethEstimateGas,
      },
      "estimated CGL"
    );
    userOp.callGasLimit = callGasLimit;
    let preVerificationGas: BigNumberish =
      this.entryPointService.calcPreverificationGas(entryPoint, userOp);
    const gasFee = await this.skandhaModule.getGasPrice();

    if (this.pvgEstimator) {
      userOp.maxFeePerGas = gasFee.maxFeePerGas;
      userOp.maxPriorityFeePerGas = gasFee.maxPriorityFeePerGas;
      const data = this.entryPointService.encodeHandleOps(
        entryPoint,
        [userOp],
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
          userOp,
        }
      );
    }
    preVerificationGas = BigNumber.from(preVerificationGas)
      .mul(10000 + this.config.pvgMarkupPercent)
      .div(10000);

    this.metrics?.useropsEstimated.inc();

    return {
      preVerificationGas,
      verificationGasLimit,
      verificationGas: verificationGasLimit,
      validAfter: validAfter ? BigNumber.from(validAfter) : undefined,
      validUntil: validUntil ? BigNumber.from(validUntil) : undefined,
      callGasLimit,
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
    const entry = await this.mempoolService.getEntryByHash(hash);
    if (entry) {
      if (entry.status < MempoolEntryStatus.Submitted || entry.transaction) {
        let transaction: Partial<ethers.providers.TransactionResponse> = {};
        if (entry.transaction) {
          transaction = await this.provider.getTransaction(entry.transaction);
        }
        return {
          userOperation: hexlifyUserOp(entry.userOp),
          entryPoint: entry.entryPoint,
          transactionHash: transaction.hash,
          blockHash: transaction.blockHash,
          blockNumber: transaction.blockNumber,
        };
      }
    }
    const rpcUserOp = await this.entryPointService.getUserOperationByHash(hash);
    if (!rpcUserOp && this.blockscoutApi) {
      return await this.blockscoutApi.getUserOperationByHash(hash);
    }
    return rpcUserOp || null;
  }

  /**
   *
   * @param hash user op hash
   * @returns a UserOperation receipt
   */
  async getUserOperationReceipt(
    hash: string
  ): Promise<UserOperationReceipt | null> {
    const rpcUserOp = await this.entryPointService.getUserOperationReceipt(
      hash
    );
    if (!rpcUserOp && this.blockscoutApi) {
      return await this.blockscoutApi.getUserOperationReceipt(hash);
    }
    return rpcUserOp || null;
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
