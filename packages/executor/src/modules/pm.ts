import RpcError from "@skandha/types/lib/api/errors/rpc-error";
import * as RpcErrorCodes from "@skandha/types/lib/api/errors/rpc-error-codes";
import { NetworkConfig, SimulateHandleOpResultAndGasLimits } from "../interfaces";
import { EntryPointService, UserOpValidationService } from "../services";
import { SponsorUserOperationArgs } from "./interfaces"
import { UserOperation } from "@skandha/types/lib/contracts/UserOperation";
import { Address, PublicClient } from "viem";
import { IPaymasterService } from "../services/PaymasterService/versions/base";
import {
  estimateOptimismPVG,
  estimateArbitrumPVG,
  estimateMantlePVG,
  AddressZero,
  ECDSA_DUMMY_SIGNATURE
} from "@skandha/params/lib";
import { Skandha } from "./skandha";
import { IPVGEstimator } from "@skandha/params/lib/types/IPVGEstimator";


type BigNumberish = bigint | number | `0x${string}` | `${number}` | string;

export class Pm {
  private pvgEstimator: IPVGEstimator | null = null;
  constructor(
    private chainId: number,
    private publicClient: PublicClient,
    private config: NetworkConfig,
    private entryPointService: EntryPointService,
    private paymasterService: IPaymasterService,
    private userOpValidationService: UserOpValidationService,
    private skandhaModule: Skandha,

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
  }

  private calcVerificationGasAndCallGasLimit(
    userOp: UserOperation,
    executionResult: {
      preOpGas: bigint;
      paid: bigint;
    },
    gasLimits?: {
      callGasLimit?: bigint;
      verificationGasLimit?: bigint;
      paymasterVerificationGasLimit?: bigint;
    }
  ): {
    verificationGasLimit: bigint;
    callGasLimit: bigint;
    paymasterVerificationGasLimit: bigint;
  } {
    const verificationGasLimit =
      gasLimits?.verificationGasLimit ??
      (BigInt(executionResult.preOpGas - BigInt(userOp.preVerificationGas)) *
        BigInt(150)) /
        BigInt(100);

    const calculatedCallGasLimit =
      gasLimits?.callGasLimit ??
      executionResult.paid / BigInt(userOp.maxFeePerGas) -
        executionResult.preOpGas;

    const callGasLimit =
      calculatedCallGasLimit > BigInt(9000)
        ? calculatedCallGasLimit
        : BigInt(9000);

    return {
      verificationGasLimit,
      callGasLimit,
      paymasterVerificationGasLimit:
        gasLimits?.paymasterVerificationGasLimit ?? BigInt(0),
    };
  }

  private markupEstimate(
    estimate: bigint,
    percent: bigint,
    flat: bigint
  ): bigint {
    return (
      (estimate * (BigInt(10000) + percent)) / BigInt(10000) + BigInt(flat)
    );
  }

  private async handleSimulationResults(
    entryPoint: string,
    estimates: SimulateHandleOpResultAndGasLimits,
    userOp: UserOperation
  ): Promise<{
    callGasLimit: bigint;
    verificationGas: bigint;
    verificationGasLimit: bigint;
    maxFeePerGas: BigNumberish;
    maxPriorityFeePerGas: BigNumberish;
    preVerificationGas: bigint;
    paymasterVerificationGasLimit: bigint;
    paymasterPostOpGasLimit: bigint;
  }> {
    let { callGasLimit, verificationGasLimit, paymasterVerificationGasLimit } =
      this.calcVerificationGasAndCallGasLimit(
        userOp,
        estimates.executionResult,
        {
          callGasLimit: estimates.callGasLimit,
          paymasterVerificationGasLimit:
            estimates.paymasterVerificationGasLimit,
          verificationGasLimit: estimates.verificationGasLimit,
        }
      );

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

    const { maxFeePerGas, maxPriorityFeePerGas } = gasFee;

    let paymasterPostOpGasLimit = BigInt(0);

    if (userOp.paymaster) {
      paymasterPostOpGasLimit =
        estimates.executionResult.paymasterPostOpGasLimit;
      paymasterVerificationGasLimit =
        estimates.executionResult.paymasterVerificationGasLimit;
    }

    callGasLimit = this.markupEstimate(
      callGasLimit,
      BigInt(this.config.cglMarkupPercent),
      BigInt(this.config.cglMarkup)
    );
    verificationGasLimit = this.markupEstimate(
      verificationGasLimit,
      BigInt(this.config.vglMarkupPercent),
      BigInt(this.config.vglMarkup)
    );
    preVerificationGas = this.markupEstimate(
      BigInt(preVerificationGas),
      BigInt(this.config.pvgMarkupPercent),
      BigInt(this.config.pvgMarkup)
    );
    paymasterVerificationGasLimit = this.markupEstimate(
      paymasterVerificationGasLimit,
      BigInt(this.config.paymasterVglMarkupPercent),
      BigInt(this.config.paymasterVglMarkup)
    );
    paymasterPostOpGasLimit = this.markupEstimate(
      paymasterPostOpGasLimit,
      BigInt(this.config.paymasterPoglMarkupPercent),
      BigInt(this.config.paymasterPoglMarkup)
    );

    return {
      callGasLimit,
      verificationGas: verificationGasLimit,
      verificationGasLimit,
      maxFeePerGas,
      maxPriorityFeePerGas,
      preVerificationGas,
      paymasterVerificationGasLimit,
      paymasterPostOpGasLimit,
    };
  }

  async sponsorUserOperation(args: SponsorUserOperationArgs) {
    const { userOp: partialUserOp, entryPoint, context } = args;

    if (!this.entryPointService.isEntryPointSupported(entryPoint)) {
      throw new RpcError("Invalid Entrypoint", RpcErrorCodes.INVALID_REQUEST);
    }

    const isSupportedToken = Object.keys(this.config.supportedPaymasterTokens).some(
      (addr) => addr.toLowerCase() === context.token.toLowerCase()
    );

    if (!isSupportedToken) {
      throw new RpcError("Unsupported token for paymaster", RpcErrorCodes.INVALID_REQUEST);
    }

    if (partialUserOp.eip7702Auth && !this.config.eip7702) {
      throw new RpcError(
        "EIP7702 is not supported in this network",
        RpcErrorCodes.INVALID_USEROP
      );
    }

    const validAfter = Math.floor(Date.now() / 1000) - 5;
    const validUntil = Math.floor(Date.now() / 1000) + 300;

    const userOp: UserOperation = {
      ...partialUserOp,
      paymaster: this.config.multiTokenPaymaster as Address,
      paymasterData: this.paymasterService.getPaymasterDataForEstimation(
        validUntil,
        validAfter,
        context.token as Address
      ),
      callGasLimit: BigInt(10e6),
      paymasterVerificationGasLimit: BigInt(10e6),
      paymasterPostOpGasLimit: BigInt(10e6),
      preVerificationGas: BigInt(0),
      verificationGasLimit: BigInt(10e6),
      maxFeePerGas: 1,
      maxPriorityFeePerGas: 1,
    };

    if (userOp.signature.length <= 2) {
      userOp.signature = ECDSA_DUMMY_SIGNATURE;
    }

    // eslint-disable-next-line prefer-const
    const validateForEstimationResponse =
      await this.userOpValidationService.validateForEstimation(
        userOp,
        entryPoint,
      );
    
    const results = await this.handleSimulationResults(
      entryPoint,
      validateForEstimationResponse as SimulateHandleOpResultAndGasLimits,
      userOp
    )

    userOp.callGasLimit = results.callGasLimit;
    userOp.verificationGasLimit = results.verificationGas;
    userOp.preVerificationGas = results.preVerificationGas;
    userOp.paymasterVerificationGasLimit = results.paymasterVerificationGasLimit;
    userOp.paymasterPostOpGasLimit = results.paymasterPostOpGasLimit;
    userOp.maxFeePerGas = results.maxFeePerGas;
    userOp.maxPriorityFeePerGas = results.maxPriorityFeePerGas;

    const paymasterData = await this.paymasterService.getPaymasterData(
      userOp,
      validUntil,
      validAfter,
      context.token as Address
    );

    const payamsterAndData = this.paymasterService.packPaymasterData(
      userOp.paymaster!,
      userOp.paymasterVerificationGasLimit,
      userOp.paymasterPostOpGasLimit,
      paymasterData
    )

    return {
      paymaster: userOp.paymaster,
      paymasterData,
      payamsterAndData,
      paymasterVerificationGasLimit: userOp.paymasterVerificationGasLimit,
      paymasterPostOpGasLimit: userOp.paymasterPostOpGasLimit,
      callGasLimit: userOp.callGasLimit,
      verificationGasLimit: userOp.verificationGasLimit,
      preVerificationGas: userOp.preVerificationGas,
      maxFeePerGas: userOp.maxFeePerGas,
      maxPriorityFeePerGas: userOp.maxPriorityFeePerGas
    };
  }
}