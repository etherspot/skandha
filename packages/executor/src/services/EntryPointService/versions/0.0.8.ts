import {
  EntryPoint,
  UserOperationEventEvent,
} from "@skandha/types/lib/contracts/EPv8/core/EntryPoint";
import { _deployedBytecode } from "@skandha/types/lib/contracts/EPv8/factories/core/EntryPointSimulations__factory";
import { IStakeManager } from "@skandha/types/lib/contracts/EPv8/core/EntryPointSimulations";
import { EntryPoint__factory } from "@skandha/types/lib/contracts/EPv8/factories/core";
import { BigNumber, constants, providers } from "ethers";
import RpcError from "@skandha/types/lib/api/errors/rpc-error";
import * as RpcErrorCodes from "@skandha/types/lib/api/errors/rpc-error-codes";
import {
  PackedUserOperation,
  UserOperation,
} from "@skandha/types/lib/contracts/UserOperation";
import { AddressZero } from "@skandha/params/lib";
import { StakeManager__factory } from "@skandha/types/lib/contracts/EPv8/factories/core";
import { IEntryPointSimulations } from "@skandha/types/lib/contracts/EPv8/interfaces";
import { IEntryPointSimulations__factory } from "@skandha/types/lib/contracts/EPv8/factories/interfaces";
import { hexlify, arrayify } from "ethers/lib/utils";
import { Logger } from "@skandha/types/lib";
import {
  UserOperationReceipt,
  UserOperationByHashResponse,
} from "@skandha/types/lib/api/interfaces";
import { deepHexlify } from "@skandha/utils/lib/hexlify";
import {
  CallGasEstimationProxy__factory,
  _deployedBytecode as _callGasEstimationProxyDeployedBytecode,
} from "@skandha/types/lib/contracts/EPv7/factories/core/CallGasEstimationProxy__factory";
import { CallGasEstimationProxy } from "@skandha/types/lib/contracts/EPv7/core/CallGasEstimationProxy";
import {
  encodeUserOp,
  mergeValidationDataValues,
  packUserOp,
  unpackUserOp,
} from "../utils";
import {
  Log,
  NetworkConfig,
  StakeInfo,
  UserOpValidationResult,
} from "../../../interfaces";
import {
  DefaultGasOverheads,
  IMPLEMENTATION_ADDRESS_MARKER,
} from "../constants";
import { StateOverrides } from "../interfaces";
import {
  decodeRevertReason,
  decodeTargetData,
} from "../utils/decodeRevertReason";
import { getUserOpGasLimit } from "../../BundlingService/utils";
import { IEntryPointService } from "./base";

const entryPointSimulations = IEntryPointSimulations__factory.createInterface();
const callGasEstimateProxy = CallGasEstimationProxy__factory.createInterface();

export class EntryPointV8Service implements IEntryPointService {
  contract: EntryPoint;

  constructor(
    public address: string,
    private networkConfig: NetworkConfig,
    private provider: providers.JsonRpcProvider,
    private logger: Logger
  ) {
    this.contract = EntryPoint__factory.connect(address, provider);
  }

  /*******************/
  /** View functions */

  async getUserOperationHash(userOp: UserOperation): Promise<string> {
    return await this.contract.getUserOpHash(packUserOp(userOp));
  }

  async simulateHandleOp(userOp: UserOperation): Promise<any> {
    const gasLimit = this.networkConfig.gasFeeInSimulation
      ? getUserOpGasLimit(
          userOp,
          constants.Zero,
          this.networkConfig.estimationGasLimit
        )
      : undefined;

    const estimateCallGasArgs: CallGasEstimationProxy.EstimateCallGasArgsStruct =
      {
        userOp: packUserOp(userOp),
        isContinuation: true,
        maxGas: "20000000",
        minGas: "21000",
        rounding: "500",
      };

    const [data] = this.encodeSimulateHandleOp(
      userOp,
      this.address,
      callGasEstimateProxy.encodeFunctionData("estimateCallGas", [
        estimateCallGasArgs,
      ])
    );

    const tx: providers.TransactionRequest = {
      to: this.address,
      data,
      gasLimit,
    };

    const stateOverrides: StateOverrides = userOp.eip7702Auth
      ? {
          [this.address]: {
            code: _callGasEstimationProxyDeployedBytecode,
          },
          [IMPLEMENTATION_ADDRESS_MARKER]: {
            code: _deployedBytecode,
          },
          [userOp.sender]: {
            code: "0xef0100" + userOp.eip7702Auth.address.substring(2),
          },
        }
      : {
          [this.address]: {
            code: _callGasEstimationProxyDeployedBytecode,
          },
          [IMPLEMENTATION_ADDRESS_MARKER]: {
            code: _deployedBytecode,
          },
        };

    try {
      const simulationResult = await this.provider.send("eth_call", [
        tx,
        "latest",
        stateOverrides,
      ]);
      const res = entryPointSimulations.decodeFunctionResult(
        "simulateHandleOp",
        simulationResult
      );
      const [callGasLimit] = decodeTargetData(res[0].targetResult);
      return { returnInfo: res[0], callGasLimit: callGasLimit };
    } catch (error: any) {
      console.log(error);
      const err = decodeRevertReason(error);
      if (err != null) {
        throw new RpcError(err, RpcErrorCodes.EXECUTION_REVERTED);
      }
      throw error;
    }
  }

  async simulateValidation(userOp: UserOperation): Promise<any> {
    const [data, stateOverrides] = this.encodeSimulateValidation(userOp);
    const tx: providers.TransactionRequest = {
      to: this.address,
      data,
    };
    try {
      const errorResult = await this.provider
        .send("eth_call", [tx, "latest", stateOverrides])
        .catch((err) => this.nonGethErrorHandler(err));
      return this.parseValidationResult(userOp, errorResult);
    } catch (err: any) {
      console.log(err);
      const decodedError = decodeRevertReason(err);
      if (decodedError != null) {
        throw new RpcError(decodedError, RpcErrorCodes.VALIDATION_FAILED);
      }
      throw err;
    }
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
  ): [string, StateOverrides] {
    return [
      entryPointSimulations.encodeFunctionData("simulateHandleOp", [
        packUserOp(userOp),
        target,
        targetCallData,
      ]),
      {
        [this.address]: {
          code: _deployedBytecode,
        },
      },
    ];
  }

  encodeSimulateValidation(userOp: UserOperation): [string, StateOverrides] {
    return !userOp.eip7702Auth
      ? [
          entryPointSimulations.encodeFunctionData("simulateValidation", [
            packUserOp(userOp),
          ]),
          {
            [this.address]: {
              code: _deployedBytecode,
            },
          },
        ]
      : [
          entryPointSimulations.encodeFunctionData("simulateValidation", [
            packUserOp(userOp),
          ]),
          {
            [this.address]: {
              code: _deployedBytecode,
            },
            [userOp.sender]: {
              code: "0xef0100" + userOp.eip7702Auth.address.substring(2),
            },
          },
        ];
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
    const ops: PackedUserOperation[] = parsed?.args.ops;
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
      userOperation: unpackUserOp(op),
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
    const encoded: string = encodeUserOp(packedUserOp, forSignature);
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
    const [decoded] = entryPointSimulations.decodeFunctionResult(
      "simulateValidation",
      data
    ) as IEntryPointSimulations.ValidationResultStructOutput[];
    const mergedValidation = mergeValidationDataValues(
      decoded.returnInfo.accountValidationData,
      decoded.returnInfo.paymasterValidationData
    );
    function fillEntity(
      addr: string | undefined,
      info: IStakeManager.StakeInfoStructOutput
    ): StakeInfo | undefined {
      if (addr == null || addr === AddressZero) return undefined;
      return {
        addr,
        stake: info.stake,
        unstakeDelaySec: info.unstakeDelaySec,
      };
    }

    const returnInfo = {
      sigFailed: mergedValidation.aggregator !== AddressZero,
      validUntil: mergedValidation.validUntil,
      validAfter: mergedValidation.validAfter,
      preOpGas: decoded.returnInfo.preOpGas,
      prefund: decoded.returnInfo.prefund,
    };
    return {
      returnInfo,
      senderInfo: fillEntity(userOp.sender, decoded.senderInfo) as StakeInfo,
      paymasterInfo: fillEntity(userOp.paymaster, decoded.paymasterInfo),
      factoryInfo: fillEntity(userOp.factory, decoded.factoryInfo),
      aggregatorInfo: fillEntity(
        decoded.aggregatorInfo.aggregator,
        decoded.aggregatorInfo.stakeInfo
      ),
      belongsToCanonicalMempool: true,
    };
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
    throw errorResult;
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
