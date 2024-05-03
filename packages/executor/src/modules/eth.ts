import { BigNumber, BigNumberish, ethers } from "ethers";
import { arrayify, hexlify } from "ethers/lib/utils";
import RpcError from "types/lib/api/errors/rpc-error";
import * as RpcErrorCodes from "types/lib/api/errors/rpc-error-codes";
import {
  IEntryPoint,
  UserOperationEventEvent,
  UserOperationStruct,
} from "types/lib/executor/contracts/EntryPoint";
import {
  EstimatedUserOperationGas,
  UserOperationByHashResponse,
  UserOperationReceipt,
} from "types/lib/api/interfaces";
import { MempoolEntryStatus } from "types/lib/executor";
import { IEntryPoint__factory } from "types/lib/executor/contracts/factories";
import { IPVGEstimator } from "params/lib/types/IPVGEstimator";
import {
  estimateOptimismPVG,
  estimateArbitrumPVG,
  ECDSA_DUMMY_SIGNATURE,
  estimateMantlePVG,
  estimateAncient8PVG,
} from "params/lib";
import { Logger } from "types/lib";
import { PerChainMetrics } from "monitoring/lib";
import { deepHexlify } from "utils/lib/hexlify";
import { packUserOp } from "../utils";
import { UserOpValidationService, MempoolService } from "../services";
import { GetNodeAPI, Log, NetworkConfig } from "../interfaces";
import { getUserOpGasLimit } from "../services/BundlingService/utils";
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

    // ["optimism", "optimismGoerli", "base"]
    if ([10, 420, 8453].includes(this.chainId)) {
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
    const userOp = args.userOp as unknown as UserOperationStruct;
    const entryPoint = args.entryPoint;
    if (!this.validateEntryPoint(entryPoint)) {
      throw new RpcError("Invalid Entrypoint", RpcErrorCodes.INVALID_REQUEST);
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

    const entryPointContract = IEntryPoint__factory.connect(
      entryPoint,
      this.provider
    );
    const userOpHash = await entryPointContract.getUserOpHash(userOp);
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
            userOp,
            blockNumber.toString(),
            canonicalMempoolId
          );
          this.metrics?.useropsSent?.inc();
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
    const { userOp, entryPoint } = args;
    if (!this.validateEntryPoint(entryPoint)) {
      throw new RpcError("Invalid Entrypoint", RpcErrorCodes.INVALID_REQUEST);
    }

    const userOpComplemented: UserOperationStruct = {
      paymasterAndData: userOp.paymasterAndData ?? "0x",
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
      .add(this.config.vglMarkup)
      .toNumber();

    let preVerificationGas: BigNumberish =
      this.calcPreVerificationGas(userOpComplemented);
    userOpComplemented.preVerificationGas = preVerificationGas;
    let callGasLimit: BigNumber = BigNumber.from(0);

    // calculate callGasLimit based on paid fee
    const { cglMarkup } = this.config;
    callGasLimit = BigNumber.from(paid).div(userOpComplemented.maxFeePerGas);
    callGasLimit = callGasLimit.sub(preOpGas).add(cglMarkup || 0);

    if (callGasLimit.lt(0)) {
      callGasLimit = BigNumber.from(cglMarkup || 0);
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

    const gasFee = await this.skandhaModule.getGasPrice();

    if (this.pvgEstimator) {
      userOpComplemented.maxFeePerGas = gasFee.maxFeePerGas;
      userOpComplemented.maxPriorityFeePerGas = gasFee.maxPriorityFeePerGas;
      preVerificationGas = await this.pvgEstimator(
        entryPoint,
        userOpComplemented,
        preVerificationGas
      );
    }

    this.metrics?.useropsEstimated.inc();

    return {
      preVerificationGas,
      verificationGasLimit: verificationGasLimit,
      verificationGas: verificationGasLimit,
      validAfter: validAfter ? BigNumber.from(validAfter) : undefined,
      validUntil: validUntil ? BigNumber.from(validUntil) : undefined,
      callGasLimit: callGasLimit,
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
    const { userOp, entryPoint } = args;
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
    // const preVerificationGas = this.calcPreVerificationGas(userOp);
    const verificationGasLimit = BigNumber.from(preOpGas).toNumber();

    return {
      preVerificationGas: this.calcPreVerificationGas(userOp),
      verificationGasLimit,
      verificationGas: verificationGasLimit,
      validAfter: BigNumber.from(validAfter),
      validUntil: BigNumber.from(validUntil),
      callGasLimit,
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
    const { userOp, entryPoint } = args;
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
    if (entry && entry.status < MempoolEntryStatus.Submitted) {
      let transaction: Partial<ethers.providers.TransactionResponse> = {};
      if (entry.transaction) {
        transaction = await this.provider.getTransaction(entry.transaction);
      }
      return {
        userOperation: entry.userOp,
        entryPoint: entry.entryPoint,
        transactionHash: transaction.hash,
        blockHash: transaction.blockHash,
        blockNumber: transaction.blockNumber,
      };
    }
    const [entryPoint, event] = await this.getUserOperationEvent(hash);
    if (!entryPoint || !event) {
      return null;
    }
    const tx = await event.getTransaction();
    if (tx.to !== entryPoint.address) {
      throw new Error("unable to parse transaction");
    }
    const parsed = entryPoint.interface.parseTransaction(tx);
    const ops: UserOperationStruct[] = parsed?.args.ops;
    if (ops.length == 0) {
      throw new Error("failed to parse transaction");
    }
    const op = ops.find(
      (o) =>
        o.sender === event.args.sender &&
        BigNumber.from(o.nonce).eq(event.args.nonce)
    );
    if (!op) {
      throw new Error("unable to find userOp in transaction");
    }

    const {
      sender,
      nonce,
      initCode,
      callData,
      callGasLimit,
      verificationGasLimit,
      preVerificationGas,
      maxFeePerGas,
      maxPriorityFeePerGas,
      paymasterAndData,
      signature,
    } = op;

    return deepHexlify({
      userOperation: {
        sender,
        nonce,
        initCode,
        callData,
        callGasLimit,
        verificationGasLimit,
        preVerificationGas,
        maxFeePerGas,
        maxPriorityFeePerGas,
        paymasterAndData,
        signature,
      },
      entryPoint: entryPoint.address,
      transactionHash: tx.hash,
      blockHash: tx.blockHash ?? "",
      blockNumber: tx.blockNumber ?? 0,
    });
  }

  /**
   *
   * @param hash user op hash
   * @returns a UserOperation receipt
   */
  async getUserOperationReceipt(
    hash: string
  ): Promise<UserOperationReceipt | null> {
    const [entryPoint, event] = await this.getUserOperationEvent(hash);
    if (!event || !entryPoint) {
      return null;
    }
    const receipt = await event.getTransactionReceipt();
    const logs = this.filterLogs(event, receipt.logs);
    return deepHexlify({
      userOpHash: hash,
      sender: event.args.sender,
      nonce: event.args.nonce,
      actualGasCost: event.args.actualGasCost,
      actualGasUsed: event.args.actualGasUsed,
      success: event.args.success,
      logs,
      receipt,
    });
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
    return this.config.entryPoints.map((address) =>
      ethers.utils.getAddress(address)
    );
  }

  validateEntryPoint(entryPoint: string): boolean {
    return (
      this.config.entryPoints != null &&
      this.config.entryPoints.findIndex(
        (ep) => ep.toLowerCase() === entryPoint.toLowerCase()
      ) !== -1
    );
  }

  static DefaultGasOverheads = {
    fixed: 21000,
    perUserOp: 18300,
    perUserOpWord: 4,
    zeroByte: 4,
    nonZeroByte: 16,
    bundleSize: 1,
    sigSize: 65,
  };

  /**
   * calculate the preVerificationGas of the given UserOperation
   * preVerificationGas (by definition) is the cost overhead that can't be calculated on-chain.
   * it is based on parameters that are defined by the Ethereum protocol for external transactions.
   * @param userOp filled userOp to calculate. The only possible missing fields can be the signature and preVerificationGas itself
   * @param overheads gas overheads to use, to override the default values
   */
  private calcPreVerificationGas(
    userOp: Partial<UserOperationStruct>,
    overheads?: Partial<typeof Eth.DefaultGasOverheads>
  ): number {
    const ov = { ...Eth.DefaultGasOverheads, ...(overheads ?? {}) };
    const p: UserOperationStruct = {
      preVerificationGas: 21000,
      signature: hexlify(Buffer.alloc(ov.sigSize, 1)),
      ...userOp,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any;

    const packed = arrayify(packUserOp(p, false));
    const lengthInWord = (packed.length + 31) / 32;
    const callDataCost = packed
      .map((x) => (x === 0 ? ov.zeroByte : ov.nonZeroByte))
      .reduce((sum, x) => sum + x);
    const ret = Math.round(
      callDataCost +
        ov.fixed / ov.bundleSize +
        ov.perUserOp +
        ov.perUserOpWord * lengthInWord
    );
    return Math.max(ret + this.config.pvgMarkup, 0);
  }

  private async getUserOperationEvent(
    userOpHash: string
  ): Promise<[IEntryPoint | null, UserOperationEventEvent | null]> {
    if (!userOpHash) {
      throw new RpcError(
        "Missing/invalid userOpHash",
        RpcErrorCodes.METHOD_NOT_FOUND
      );
    }

    let event: UserOperationEventEvent[] = [];
    for (const addr of await this.getSupportedEntryPoints()) {
      const contract = IEntryPoint__factory.connect(addr, this.provider);
      try {
        const blockNumber = await this.provider.getBlockNumber();
        let fromBlockNumber = blockNumber - this.config.receiptLookupRange;
        // underflow check
        if (fromBlockNumber < 0) {
          fromBlockNumber = 0;
        }
        event = await contract.queryFilter(
          contract.filters.UserOperationEvent(userOpHash),
          fromBlockNumber
        );
        // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
        if (event[0]) {
          return [contract, event[0]];
        }
      } catch (err) {
        this.logger.error(err);
        throw new RpcError(
          "Missing/invalid userOpHash",
          RpcErrorCodes.METHOD_NOT_FOUND
        );
      }
    }
    return [null, null];
  }

  private filterLogs(userOpEvent: UserOperationEventEvent, logs: Log[]): Log[] {
    let startIndex = -1;
    let endIndex = -1;
    logs.forEach((log, index) => {
      if (log?.topics[0] === userOpEvent.topics[0]) {
        // process UserOperationEvent
        if (log.topics[1] === userOpEvent.topics[1]) {
          // it's our userOpHash. save as end of logs array
          endIndex = index;
        } else {
          // it's a different hash. remember it as beginning index, but only if we didn't find our end index yet.
          if (endIndex === -1) {
            startIndex = index;
          }
        }
      }
    });
    if (endIndex === -1) {
      throw new Error("fatal: no UserOperationEvent in logs");
    }
    return logs.slice(startIndex + 1, endIndex);
  }
}
