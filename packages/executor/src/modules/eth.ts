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
import { PublicClient, Hex, GetTransactionReturnType } from "viem";
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

type BigNumberish = bigint | number | `0x${string}` | `${number}`;

export class Eth {
  private pvgEstimator: IPVGEstimator | null = null;
  private blockscoutApi: BlockscoutAPI | null = null;

  constructor(
    private chainId: number,
    private publicClient: PublicClient,
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
      this.pvgEstimator = estimateArbitrumPVG(this.publicClient);
    }

    // ["optimism", "optimismGoerli", "base", "ancient8"]
    if ([10, 420, 8453, 888888888].includes(this.chainId)) {
      this.pvgEstimator = estimateOptimismPVG(this.publicClient);
    }

    // mantle, mantle testnet, mantle sepolia
    if ([5000, 5001, 5003].includes(this.chainId)) {
      this.pvgEstimator = estimateMantlePVG(this.publicClient);
    }

    if (this.config.blockscoutUrl) {
      this.blockscoutApi = new BlockscoutAPI(
        this.publicClient,
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
    const entryPoint = args.entryPoint.toLowerCase() as Hex;
    if (!this.validateEntryPoint(entryPoint)) {
      throw new RpcError("Invalid Entrypoint", RpcErrorCodes.INVALID_REQUEST);
    }

    if (userOp.eip7702Auth && !this.config.eip7702) {
      throw new RpcError(
        "EIP7702 is not supported in this network",
        RpcErrorCodes.INVALID_USEROP
      );
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

      const currentNonce = await this.publicClient.getTransactionCount({
        address: userOp.sender
      });

      if (
        BigInt(currentNonce) !== BigInt(userOp.eip7702Auth.nonce)
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
    if (getUserOpGasLimit(userOp) > BigInt(this.config.userOpGasLimit)) {
      throw new RpcError(
        "UserOp's gas limit is too high",
        RpcErrorCodes.INVALID_USEROP
      );
    }

    const userOpHash = await this.entryPointService.getUserOpHash(
      entryPoint,
      userOp
    );

    await this.userOpValidationService.validateGasFee(userOp);
    const validationResult =
      await this.userOpValidationService.simulateValidation(userOp, entryPoint);
    // TODO: fetch aggregator
    this.logger.debug(
      "Opcode validation successful. Trying saving in mempool..."
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
            const blockNumber = await this.publicClient.getBlockNumber(); // TODO: fetch blockNumber from simulateValidation
            await nodeApi.publishVerifiedUserOperationJSON(
              entryPoint,
              userOp as UserOperationStruct,
              blockNumber.toString(),
              canonicalMempoolId
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
      callGasLimit: BigInt(10e6),
      preVerificationGas: BigInt(1e6),
      verificationGasLimit: BigInt(10e6),
      maxFeePerGas: 1,
      maxPriorityFeePerGas: 1,
    };

    if (userOp.eip7702Auth && !this.config.eip7702) {
      throw new RpcError(
        "EIP7702 is not supported in this network",
        RpcErrorCodes.INVALID_USEROP
      );
    }

    if (this.chainId == 80002) {
      userOp.callGasLimit = BigInt(20e6);
      userOp.preVerificationGas = BigInt(50000);
      userOp.verificationGasLimit = BigInt(3e6);
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
    const verificationGasLimit = Number(
      (
        (
          (BigInt(preOpGas) - BigInt(userOp.preVerificationGas)) *
          BigInt(10000 + this.config.vglMarkupPercent)
        ) / BigInt(10000)
      ) +
      BigInt(this.config.vglMarkup)
    );

    const { cglMarkup } = this.config;
    // calculate callGasLimit based on paid fee
    const totalGas = BigInt(paid)/BigInt(userOp.maxFeePerGas);
    const paidFeeCGL = totalGas - BigInt(preOpGas);

    let ethEstimateGas;
    if (userOp.eip7702Auth) {
      ethEstimateGas = await this.publicClient
        .estimateGas({
          account: entryPoint as `0x${string}`,
          to: userOp.sender as `0x${string}`,
          data: userOp.callData as `0x${string}`,
          authorizationList: [
            {
              address: userOp.eip7702Auth.address,
              chainId: Number(BigInt(userOp.eip7702Auth.chainId)),
              nonce: Number(BigInt(userOp.eip7702Auth.nonce)),
              r: userOp.eip7702Auth.r
                .toString()
                .replace(/^0x0+(?=\d)/, "0x") as `0x${string}`,
              s: userOp.eip7702Auth.s
                .toString()
                .replace(/^0x0+(?=\d)/, "0x") as `0x${string}`,
              yParity: userOp.eip7702Auth.yParity === "0x0" ? 0 : 1,
            },
          ],
        })
        .catch((err) => {
          console.error(err);
          const message =
            err.message.match(/reason="(.*?)"/)?.at(1) ?? "execution reverted";
          throw new RpcError(message, RpcErrorCodes.EXECUTION_REVERTED);
        });
    } else {
      //< checking for execution revert
      ethEstimateGas = await this.publicClient
        .estimateGas({
          account: entryPoint,
          to: userOp.sender,
          data: userOp.callData,
        })
        .catch((err) => {
          const message =
            err.message.match(/reason="(.*?)"/)?.at(1) ?? "execution reverted";
          throw new RpcError(message, RpcErrorCodes.EXECUTION_REVERTED);
        });
      //>
    }

    let callGasLimit = minBn(BigInt(binarySearchCGL), paidFeeCGL);
    // check between binary search & paid fee cgl
    if (userOp.factoryData !== undefined && userOp.factoryData.length <= 2) {
      await this.publicClient
        .estimateGas({
          account: entryPoint,
          to: userOp.sender,
          data: userOp.callData,
          gas: callGasLimit,
        })
        .catch((_) => {
          callGasLimit = maxBn(BigInt(binarySearchCGL), paidFeeCGL);
        });
    }

    // check between eth_estimateGas & binary search & paid fee cgl
    if (userOp.factoryData !== undefined && userOp.factoryData.length <= 2) {
      const prevCGL = callGasLimit;
      callGasLimit = minBn(ethEstimateGas, callGasLimit);
      await this.publicClient
        .estimateGas({
          account: entryPoint,
          to: userOp.sender,
          data: userOp.callData,
          gas: callGasLimit,
        })
        .catch((_) => {
          callGasLimit = maxBn(callGasLimit, prevCGL);
        });
    }

    callGasLimit = ((callGasLimit * BigInt(10000 + this.config.cglMarkupPercent)) / BigInt(10000)) + BigInt(cglMarkup || 0)

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

    preVerificationGas = (BigInt(preVerificationGas) * BigInt(10000 + this.config.pvgMarkupPercent))/BigInt(10000);

    this.metrics?.useropsEstimated.inc();

    return {
      preVerificationGas,
      verificationGasLimit,
      verificationGas: verificationGasLimit,
      validAfter: validAfter ? BigInt(validAfter) : undefined,
      validUntil: validUntil ? BigInt(validUntil) : undefined,
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
    const entryPoint = args.entryPoint.toLowerCase() as Hex;
    if (!this.validateEntryPoint(entryPoint)) {
      throw new RpcError("Invalid Entrypoint", RpcErrorCodes.INVALID_REQUEST);
    }

    const { returnInfo } =
      await this.userOpValidationService.validateForEstimationWithSignature(
        userOp,
        entryPoint
      );
    const { preOpGas, validAfter, validUntil } = returnInfo;
    const callGasLimit = await this.publicClient
      .estimateGas({
        account: entryPoint,
        to: userOp.sender,
        data: userOp.callData,
      })
      .then((b) => Number(b))
      .catch((err) => {
        const message =
          err.message.match(/reason="(.*?)"/)?.at(1) ?? "execution reverted";
        throw new RpcError(message, RpcErrorCodes.EXECUTION_REVERTED);
      });

    const verificationGasLimit = Number(BigInt(preOpGas));

    const gasFee = await this.skandhaModule.getGasPrice();

    return {
      preVerificationGas: this.entryPointService.calcPreverificationGas(
        entryPoint,
        userOp
      ),
      verificationGasLimit,
      verificationGas: verificationGasLimit,
      validAfter: validAfter,
      validUntil: validUntil,
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
    const entryPoint = args.entryPoint.toLowerCase() as Hex;
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
        let transaction: GetTransactionReturnType | undefined = undefined;
        if (entry.transaction) {
          transaction = await this.publicClient.getTransaction({
            hash: entry.transaction as Hex
          });
        }
        return {
          userOperation: hexlifyUserOp(entry.userOp),
          entryPoint: entry.entryPoint,
          transactionHash: transaction?.hash,
          blockHash: transaction?.blockHash,
          blockNumber: transaction?.blockNumber,
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
      this.chainId = await this.publicClient.getChainId();
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
