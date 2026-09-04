import RpcError from "@skandha/types/lib/api/errors/rpc-error";
import * as RpcErrorCodes from "@skandha/types/lib/api/errors/rpc-error-codes";
import { NetworkConfig, StateOverrides } from "../interfaces";
import { EntryPointService } from "../services";
import { GetPaymasterStubDataArgs, GetPaymasterDataArgs } from "./interfaces"
import { UserOperation } from "@skandha/types/lib/contracts/UserOperation";
import { Address, Hex } from "viem";
import { IPaymasterService } from "../services/PaymasterService/versions/base";
import { ECDSA_DUMMY_SIGNATURE } from "@skandha/params/lib";
import { decodeRevertReason } from "../services/EntryPointService/utils/decodeRevertReason";

export class Pm {
  constructor(
    private chainId: number,
    private config: NetworkConfig,
    private entryPointService: EntryPointService,
    private paymasterService: IPaymasterService,
  ) {}

  async getPaymasterStubData(args: GetPaymasterStubDataArgs) {
    const { userOp: partialUserOp, entryPoint, context, chainId } = args;

    if (BigInt(chainId) !== BigInt(this.chainId)) {
      throw new RpcError("Invalid chain id", RpcErrorCodes.INVALID_REQUEST);
    }

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

    const paymasterData = this.paymasterService.getPaymasterDataForEstimation(
      validUntil,
      validAfter,
      context.token.toLowerCase() as Address
    );

    const payamsterAndData = this.paymasterService.packPaymasterData(
      this.config.multiTokenPaymaster as Address,
      BigInt(10e6),
      BigInt(10e6),
      paymasterData
    );

    return {
      paymaster: this.config.multiTokenPaymaster,
      paymasterData,
      payamsterAndData,
      paymasterVerificationGasLimit: BigInt(10e6),
      paymasterPostOpGasLimit: BigInt(10e6),
    }
  }

  async getPaymasterData(args: GetPaymasterDataArgs) {
    const { userOp: partialUserOp, entryPoint, chainId, context } = args;

    if(BigInt(chainId) !== BigInt(this.chainId)) {
      throw new RpcError("Invalid Chain id", RpcErrorCodes.INVALID_REQUEST);
    }

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
        context.token.toLowerCase() as Address
      ),
      paymasterVerificationGasLimit: BigInt(10e6),
      paymasterPostOpGasLimit: BigInt(10e6),
    };

    if (userOp.signature.length <= 2) {
      userOp.signature = ECDSA_DUMMY_SIGNATURE;
    }

    const stateOverride: StateOverrides | undefined = userOp.eip7702Auth
      ? {
          [userOp.sender.toLowerCase() as Address]: {
            code: "0xef0100" + userOp.eip7702Auth.address.substring(2).toLowerCase() as Hex,
          },
        }
      : undefined;

    const estimationUserOp: UserOperation = {
      ...userOp,
      maxFeePerGas: BigInt(1),
      maxPriorityFeePerGas: BigInt(1),
    };

    const result = await this.entryPointService.performBinarySearch(
      entryPoint as Address,
      estimationUserOp,
      stateOverride
    );

    if(result.result === "failed") {
      throw new RpcError(
        decodeRevertReason(result.data) ?? "execution reverted",
        result.code
      );
    }

    if (!result.data.success) {
      throw new RpcError(
        decodeRevertReason(result.data.returnData) ?? "execution reverted",
        RpcErrorCodes.EXECUTION_REVERTED
      );
    }

    userOp.paymasterVerificationGasLimit = (
      result.data.gasUsed * (BigInt(10000) + BigInt(this.config.paymasterVglMarkupPercent))
    ) / BigInt(10000) + BigInt(this.config.paymasterVglMarkup);
    userOp.paymasterPostOpGasLimit = (
      BigInt(1) * (BigInt(10000) + BigInt(this.config.paymasterPoglMarkupPercent))
    ) / BigInt(10000) + BigInt(this.config.paymasterPoglMarkup)

    const paymasterData = await this.paymasterService.getPaymasterData(
      userOp,
      validUntil,
      validAfter,
      context.token.toLowerCase() as Address
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
    };
  }
}
