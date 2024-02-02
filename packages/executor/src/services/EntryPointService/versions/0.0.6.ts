import {
  UserOperationStruct,
  IEntryPoint,
  UserOperationEventEvent,
} from "types/lib/contracts/EPv6/EntryPoint";
import {
  IEntryPoint__factory,
  StakeManager__factory,
} from "types/lib/contracts/EPv6";
import { BytesLike, providers } from "ethers";
import { AddressZero, BytesZero } from "params/lib";
import RpcError from "types/lib/api/errors/rpc-error";
import * as RpcErrorCodes from "types/lib/api/errors/rpc-error-codes";
import { IStakeManager } from "types/lib/contracts/EPv7/core/StakeManager";
import {
  arrayify,
  defaultAbiCoder,
  hexlify,
  keccak256,
} from "ethers/lib/utils";
import { Logger } from "types/lib";
import {
  NetworkConfig,
  StakeInfo,
  UserOpValidationResult,
} from "../../../interfaces";
import { getAddr } from "../../../utils";
import { DefaultGasOverheads } from "../constants";
import { IEntryPointService } from "./base";

export class EntryPointV6Service implements IEntryPointService {
  contract: IEntryPoint;

  constructor(
    public address: string,
    private networkConfig: NetworkConfig,
    private provider: providers.JsonRpcProvider,
    private logger: Logger
  ) {
    this.contract = IEntryPoint__factory.connect(address, provider);
  }

  /*******************/
  /** View functions */

  async getUserOperationHash(userOp: UserOperationStruct): Promise<string> {
    return await this.contract.getUserOpHash(userOp);
  }

  async simulateHandleOp(userOp: UserOperationStruct): Promise<any> {
    return await this.contract
      .simulateHandleOp(userOp, AddressZero, BytesZero)
      .catch((err) => this.nonGethErrorHandler(err));
  }

  async simulateValidation(userOp: UserOperationStruct): Promise<any> {
    const errorResult = await this.contract
      .simulateValidation(userOp, {
        gasLimit: this.networkConfig.validationGasLimit,
      })
      .catch((err: any) => this.nonGethErrorHandler(err));
    return this.parseErrorResult(userOp, errorResult);
  }

  getDepositInfo(
    address: string
  ): Promise<IStakeManager.DepositInfoStructOutput> {
    return StakeManager__factory.connect(
      this.address,
      this.provider
    ).getDepositInfo(address);
  }

  /******************************************/
  /** Write functions (return encoded data) */

  encodeHandleOps(userOps: UserOperationStruct[], beneficiary: string): string {
    return this.contract.interface.encodeFunctionData("handleOps", [
      userOps,
      beneficiary,
    ]);
  }

  encodeSimulateHandleOp(
    userOp: UserOperationStruct,
    target: string,
    targetCallData: string
  ): string {
    return this.contract.interface.encodeFunctionData("simulateHandleOp", [
      userOp,
      target,
      targetCallData,
    ]);
  }

  encodeSimulateValidation(userOp: UserOperationStruct): string {
    return this.contract.interface.encodeFunctionData("simulateValidation", [
      userOp,
    ]);
  }

  /***********/
  /** Events */

  async getUserOperationEvent(
    userOpHash: string
  ): Promise<UserOperationEventEvent | null> {
    let event: UserOperationEventEvent[] = [];
    try {
      const blockNumber = await this.provider.getBlockNumber();
      let fromBlockNumber = blockNumber - this.networkConfig.receiptLookupRange;
      // underflow check
      if (fromBlockNumber < 0) {
        fromBlockNumber = 0;
      }
      event = await this.contract.queryFilter(
        this.contract.filters.UserOperationEvent(userOpHash),
        fromBlockNumber
      );
      // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
      if (event[0]) {
        return event[0];
      }
    } catch (err) {
      this.logger.error(err);
      throw new RpcError(
        "Missing/invalid userOpHash",
        RpcErrorCodes.METHOD_NOT_FOUND
      );
    }
    return null;
  }

  /**************/
  /** Utilities */

  calcPreverificationGas(
    userOp: Partial<UserOperationStruct>,
    forSignature = true
  ): number {
    const ov = { ...DefaultGasOverheads };
    const op = {
      preVerificationGas: 21000,
      signature: hexlify(Buffer.alloc(ov.sigSize, 1)),
      ...userOp,
    } as any;
    let encoded: string;
    if (forSignature) {
      encoded = defaultAbiCoder.encode(
        [
          "address",
          "uint256",
          "bytes32",
          "bytes32",
          "uint256",
          "uint256",
          "uint256",
          "uint256",
          "uint256",
          "bytes32",
        ],
        [
          op.sender,
          op.nonce,
          keccak256(op.initCode),
          keccak256(op.callData),
          op.callGasLimit,
          op.verificationGasLimit,
          op.preVerificationGas,
          op.maxFeePerGas,
          op.maxPriorityFeePerGas,
          keccak256(op.paymasterAndData),
        ]
      );
    } else {
      encoded = defaultAbiCoder.encode(
        [
          "address",
          "uint256",
          "bytes",
          "bytes",
          "uint256",
          "uint256",
          "uint256",
          "uint256",
          "uint256",
          "bytes",
          "bytes",
        ],
        [
          op.sender,
          op.nonce,
          op.initCode,
          op.callData,
          op.callGasLimit,
          op.verificationGasLimit,
          op.preVerificationGas,
          op.maxFeePerGas,
          op.maxPriorityFeePerGas,
          op.paymasterAndData,
          op.signature,
        ]
      );
    }
    const packed = arrayify(encoded);
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
    return Math.max(ret + this.networkConfig.pvgMarkup, 0);
  }

  parseValidationResult(
    userOp: UserOperationStruct,
    data: string
  ): UserOpValidationResult {
    const { name: errorName, args: errorArgs } =
      this.contract.interface.parseError(data);
    const errFullName = `${errorName}(${errorArgs.toString()})`;
    const errResult = this.parseErrorResult(userOp, {
      errorName,
      errorArgs,
    });
    if (!errorName.includes("Result")) {
      throw new Error(errFullName);
    }
    return errResult;
  }

  private nonGethErrorHandler(errorResult: any): any {
    try {
      let { error } = errorResult;
      if (error && error.error) {
        error = error.error;
      }
      if (error && error.code == -32015 && error.data.startsWith("Reverted ")) {
        /** NETHERMIND */
        const parsed = this.contract.interface.parseError(error.data.slice(9));
        errorResult = {
          ...parsed,
          errorName: parsed.name,
          errorArgs: parsed.args,
        };
      } else if (error && error.code == -32603 && error.data) {
        /** BIFROST */
        const parsed = this.contract.interface.parseError(error.data);
        errorResult = {
          ...parsed,
          errorName: parsed.name,
          errorArgs: parsed.args,
        };
      }
    } catch (err) {
      /* empty */
    }
    return errorResult;
  }

  private parseErrorResult(
    userOp: UserOperationStruct,
    errorResult: { errorName: string; errorArgs: any }
  ): UserOpValidationResult {
    if (!errorResult?.errorName?.startsWith("ValidationResult")) {
      // parse it as FailedOp
      // if its FailedOp, then we have the paymaster param... otherwise its an Error(string)
      let paymaster = errorResult.errorArgs?.paymaster;
      if (paymaster === AddressZero) {
        paymaster = undefined;
      }
      // eslint-disable-next-line
      const msg: string =
        errorResult.errorArgs?.reason ?? errorResult.toString();

      if (paymaster == null) {
        throw new RpcError(msg, RpcErrorCodes.VALIDATION_FAILED);
      } else {
        throw new RpcError(msg, RpcErrorCodes.REJECTED_BY_PAYMASTER, {
          paymaster,
        });
      }
    }

    const {
      returnInfo,
      senderInfo,
      factoryInfo,
      paymasterInfo,
      aggregatorInfo, // may be missing (exists only SimulationResultWithAggregator
    } = errorResult.errorArgs;

    // extract address from "data" (first 20 bytes)
    // add it as "addr" member to the "stakeinfo" struct
    // if no address, then return "undefined" instead of struct.
    function fillEntity(
      data: BytesLike,
      info: StakeInfo
    ): StakeInfo | undefined {
      const addr = getAddr(data);
      return addr == null
        ? undefined
        : {
            ...info,
            addr,
          };
    }

    return {
      returnInfo,
      senderInfo: {
        ...senderInfo,
        addr: userOp.sender,
      },
      factoryInfo: fillEntity(userOp.initCode, factoryInfo),
      paymasterInfo: fillEntity(userOp.paymasterAndData, paymasterInfo),
      aggregatorInfo: fillEntity(
        aggregatorInfo?.actualAggregator,
        aggregatorInfo?.stakeInfo
      ),
    };
  }
}
