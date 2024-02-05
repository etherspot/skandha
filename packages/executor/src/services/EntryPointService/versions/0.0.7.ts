import {
  EntryPoint,
  UserOperationEventEvent,
} from "types/lib/contracts/EPv7/core/EntryPoint";
import { EntryPointSimulations } from "types/lib/contracts/EPv7/core/EntryPointSimulations";
import {
  EntryPoint__factory,
  EntryPointSimulations__factory,
} from "types/lib/contracts/EPv7/factories/core";
import { BigNumber, providers } from "ethers";
import RpcError from "types/lib/api/errors/rpc-error";
import * as RpcErrorCodes from "types/lib/api/errors/rpc-error-codes";
import { UserOperation } from "types/lib/contracts/UserOperation";
import { AddressZero, BytesZero } from "params/lib";
import { StakeManager__factory } from "types/lib/contracts/EPv7/factories/core";
import { IStakeManager } from "types/lib/contracts/EPv7/interfaces";
import {
  hexlify,
  defaultAbiCoder,
  keccak256,
  arrayify,
} from "ethers/lib/utils";
import { Logger } from "types/lib";
import {
  UserOperationReceipt,
  UserOperationByHashResponse,
} from "types/lib/api/interfaces";
import { packUserOp } from "../utils";
import {
  Log,
  NetworkConfig,
  StakeInfo,
  UserOpValidationResult,
} from "../../../interfaces";
import { deepHexlify } from "../../../utils";
import { DefaultGasOverheads } from "../constants";
import { IEntryPointService } from "./base";

export class EntryPointV7Service implements IEntryPointService {
  contract: EntryPoint;
  simulationContract: EntryPointSimulations;

  constructor(
    public address: string,
    public simulationAddress: string,
    private networkConfig: NetworkConfig,
    private provider: providers.JsonRpcProvider,
    private logger: Logger
  ) {
    this.contract = EntryPoint__factory.connect(address, provider);
    this.simulationContract = EntryPointSimulations__factory.connect(
      simulationAddress,
      provider
    );
  }

  /*******************/
  /** View functions */

  async getUserOperationHash(userOp: UserOperation): Promise<string> {
    return await this.contract.getUserOpHash(packUserOp(userOp));
  }

  async simulateHandleOp(userOp: UserOperation): Promise<any> {
    return await this.simulationContract
      .simulateHandleOp(packUserOp(userOp), AddressZero, BytesZero)
      .catch((err) => this.nonGethErrorHandler(err));
  }

  async simulateValidation(userOp: UserOperation): Promise<any> {
    const errorResult = await this.simulationContract
      .simulateValidation(packUserOp(userOp), {
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

  encodeHandleOps(userOps: UserOperation[], beneficiary: string): string {
    return this.contract.interface.encodeFunctionData("handleOps", [
      userOps.map(packUserOp),
      beneficiary,
    ]);
  }

  encodeSimulateHandleOp(
    userOp: UserOperation,
    target: string,
    targetCallData: string
  ): string {
    return this.simulationContract.interface.encodeFunctionData(
      "simulateHandleOp",
      [packUserOp(userOp), target, targetCallData]
    );
  }

  encodeSimulateValidation(userOp: UserOperation): string {
    return this.simulationContract.interface.encodeFunctionData(
      "simulateValidation",
      [packUserOp(userOp)]
    );
  }

  /******************/
  /** UserOp Events */

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

  async getUserOperationReceipt(
    hash: string
  ): Promise<UserOperationReceipt | null> {
    const event = await this.getUserOperationEvent(hash);
    if (!event) {
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

  async getUserOperationByHash(
    hash: string
  ): Promise<UserOperationByHashResponse | null> {
    const event = await this.getUserOperationEvent(hash);
    if (!event) {
      return null;
    }
    const tx = await event.getTransaction();
    if (tx.to !== this.address) {
      throw new Error("unable to parse transaction");
    }
    const parsed = this.contract.interface.parseTransaction(tx);
    const ops: UserOperation[] = parsed?.args.ops;
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

    return deepHexlify({
      userOperation: op,
      entryPoint: this.address,
      transactionHash: tx.hash,
      blockHash: tx.blockHash ?? "",
      blockNumber: tx.blockNumber ?? 0,
    });
  }

  /**************/
  /** Utilities */

  calcPreverificationGas(
    userOp: Partial<UserOperation>,
    forSignature = true
  ): number {
    const ov = { ...DefaultGasOverheads };
    const packedUserOp = packUserOp({
      preVerificationGas: 21000,
      signature: hexlify(Buffer.alloc(ov.sigSize, 1)),
      ...userOp,
    } as any);
    let encoded: string;
    if (forSignature) {
      encoded = defaultAbiCoder.encode(
        [
          "address",
          "uint256",
          "bytes32",
          "bytes32",
          "bytes32",
          "uint256",
          "uint256",
          "uint256",
          "bytes32",
        ],
        [
          packedUserOp.sender,
          packedUserOp.nonce,
          keccak256(packedUserOp.initCode),
          keccak256(packedUserOp.callData),
          packedUserOp.accountGasLimits,
          packedUserOp.preVerificationGas,
          packedUserOp.maxFeePerGas,
          packedUserOp.maxPriorityFeePerGas,
          keccak256(packedUserOp.paymasterAndData),
        ]
      );
    } else {
      // for the purpose of calculating gas cost encode also signature (and no keccak of bytes)
      encoded = defaultAbiCoder.encode(
        [
          "address",
          "uint256",
          "bytes",
          "bytes",
          "bytes32",
          "uint256",
          "bytes32",
          "uint256",
          "uint256",
          "bytes",
        ],
        [
          packedUserOp.sender,
          packedUserOp.nonce,
          packedUserOp.initCode,
          packedUserOp.callData,
          packedUserOp.accountGasLimits,
          packedUserOp.preVerificationGas,
          packedUserOp.maxFeePerGas,
          packedUserOp.maxPriorityFeePerGas,
          packedUserOp.paymasterAndData,
          packedUserOp.signature,
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
    userOp: UserOperation,
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
    userOp: UserOperation,
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
      addr: string | undefined,
      info: StakeInfo
    ): StakeInfo | undefined {
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
      factoryInfo: fillEntity(userOp.factory, factoryInfo),
      paymasterInfo: fillEntity(userOp.paymaster, paymasterInfo),
      aggregatorInfo: fillEntity(
        aggregatorInfo?.actualAggregator,
        aggregatorInfo?.stakeInfo
      ),
    };
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
