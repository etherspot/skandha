/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  _deployedBytecode,
  EntryPointSimulations__factory,
} from "@skandha/types/lib/contracts/EPv8/factories/core/EntryPointSimulations__factory";
import { EntryPoint__factory } from "@skandha/types/lib/contracts/EPv8/factories/core";
import RpcError from "@skandha/types/lib/api/errors/rpc-error";
import * as RpcErrorCodes from "@skandha/types/lib/api/errors/rpc-error-codes.js";
import {
  PackedUserOperation,
  UserOperation,
} from "@skandha/types/lib/contracts/UserOperation";
import { AddressZero, EIP7702_PREFIX, INITCODE_EIP7702_MARKER } from "@skandha/params/lib/index.js";
import { IEntryPointSimulations__factory } from "@skandha/types/lib/contracts/EPv8/factories/interfaces";
import { hexlify, arrayify } from "ethers/lib/utils";
import { Logger } from "@skandha/types/lib/index.js";
import {
  UserOperationReceipt,
  UserOperationByHashResponse,
} from "@skandha/types/lib/api/interfaces";
import { deepHexlify } from "@skandha/utils/lib/hexlify";
import {
  CallGasEstimationProxy__factory,
  _deployedBytecode as _callGasEstimationProxyDeployedBytecode,
} from "@skandha/types/lib/contracts/EPv7/factories/core/CallGasEstimationProxy__factory";
import {
  PublicClient,
  getContract,
  Hex,
  encodeFunctionData,
  decodeFunctionResult,
  parseAbiItem,
  Log,
  decodeFunctionData,
  GetContractReturnType,
  toHex,
  Address,
  RpcStateOverride,
} from "viem";
import { _abi as pimlicoSimulationsAbi } from "@skandha/types/lib/contracts/EPv8/core/PimlicoSimulations";
import {
  encodeUserOp,
  mergeValidationDataValues,
  packUserOp,
  unpackUserOp,
} from "../utils/index.js";
import {
  NetworkConfig,
  StakeInfo,
  UserOpValidationResult,
  StateOverrides,
  SimulateBinarySearchResult,
  SimulateHandleOpResultAndGasLimits,
} from "../../../interfaces.js";
import {
  DefaultGasOverheads,
  IMPLEMENTATION_ADDRESS_MARKER,
} from "../constants.js";
import {
  decodeRevertReason,
  decodeTargetData,
} from "../utils/decodeRevertReason.js";
import { getUserOpGasLimit } from "../../BundlingService/utils/index.js";
import { BinarySearchResultType } from "../interfaces.js";
import { IEntryPointService } from "./base.js";

type SimulateHandleOpSuccessResult = {
  preOpGas: bigint;
  paid: bigint;
  accountValidationData: bigint;
  paymasterValidationData: bigint;
  paymasterVerificationGasLimit: bigint;
  paymasterPostOpGasLimit: bigint;
  targetSuccess: boolean;
  targetResult: Hex;
};

export class EntryPointV8Service implements IEntryPointService {
  contract: GetContractReturnType<typeof EntryPoint__factory.abi, PublicClient>;
  constructor(
    public address: Hex,
    private networkConfig: NetworkConfig,
    private publicClient: PublicClient,
    private logger: Logger
  ) {
    this.contract = getContract({
      abi: EntryPoint__factory.abi,
      address: address,
      client: this.publicClient,
    });
  }

  /*******************/
  /** View functions */

  async getUserOperationHash(userOp: UserOperation): Promise<Hex> {
    const packedUserOp = packUserOp(userOp);
    if (userOp.eip7702Auth && userOp.factory === INITCODE_EIP7702_MARKER) {
      const tx = {
        to: this.address,
        data: encodeFunctionData({
          abi: EntryPoint__factory.abi,
          functionName: "getUserOpHash",
          args: [packedUserOp]
        })
      };
      const stateOverrides: RpcStateOverride = {
        [userOp.sender]: {
          code: EIP7702_PREFIX + userOp.eip7702Auth.address.substring(2) as Hex,
        },
      };
      const result = await this.publicClient.request({
        method: "eth_call",
        params: [
          tx,
          "latest",
          stateOverrides
        ]
      })
      return result;
    }
    return await this.contract.read.getUserOpHash([packedUserOp]);
  }

  private async performBinarySearch({
    entryPoint,
    methodName,
    targetUserOp,
    gasLimit,
    stateOverride,
    retryCount = 0,
    initialMinGas = BigInt(9000),
    gasAllowance = BigInt(30000000),
  }: {
    entryPoint: Address;
    methodName:
      | "binarySearchVerificationGas"
      | "binarySearchPaymasterVerificationGas"
      | "binarySearchCallGas";
    gasLimit?: bigint;
    targetUserOp: UserOperation;
    stateOverride?: StateOverrides;
    retryCount?: number;
    initialMinGas?: bigint;
    gasAllowance?: bigint;
  }): Promise<SimulateBinarySearchResult> {
    if (retryCount > this.networkConfig.binarySearchMaxRetries) {
      this.logger.warn(
        { methodName, retryCount },
        "Max retries reached in binary search"
      );
      throw new RpcError(
        "Max retries reached in binary search",
        RpcErrorCodes.VALIDATION_FAILED
      );
    }

    const packedTargetOp = packUserOp(targetUserOp);

    try {
      const data = encodeFunctionData({
        abi: pimlicoSimulationsAbi,
        functionName: methodName,
        args: [
          this.networkConfig.epSimulationsContract as Address,
          entryPoint,
          [],
          packedTargetOp,
          initialMinGas,
          BigInt(10000),
          gasAllowance,
        ],
      });

      const result = await this.publicClient.request({
        method: "eth_call",
        params: [
          {
            to: this.networkConfig.pimlicoSimulationsContract as Address,
            data,
            gasLimit: gasLimit !== undefined ? toHex(gasLimit) : undefined,
          },
          "latest",
          stateOverride as any,
        ],
      });

      const decodedResult = decodeFunctionResult({
        abi: pimlicoSimulationsAbi,
        data: result,
        functionName: methodName,
      });

      // Check if simulation ran out of gas
      if (decodedResult.resultType === BinarySearchResultType.OutOfGas) {
        const { optimalGas, minGas } = decodedResult.outOfGasData;
        const newGasAllowance = optimalGas - minGas;

        return await this.performBinarySearch({
          entryPoint,
          methodName,
          targetUserOp,
          stateOverride,
          retryCount: retryCount + 1,
          initialMinGas: minGas,
          gasAllowance: BigInt(newGasAllowance),
          gasLimit,
        });
      }

      // Check for successful result
      if (decodedResult.resultType === BinarySearchResultType.Success) {
        const successData = decodedResult.successData;
        return {
          result: "success",
          data: {
            gasUsed: successData.gasUsed,
            success: successData.success,
            returnData: successData.returnData,
          },
        } as const;
      }

      throw new RpcError(
        `Userop reverted with ${decodedResult.successData.returnData}`,
        RpcErrorCodes.EXECUTION_REVERTED
      );
    } catch (error: any) {
      return {
        result: "failed",
        data: error.data,
        code: RpcErrorCodes.EXECUTION_REVERTED,
      };
    }
  }

  private async simulateAndEstimateGasLimits({
    entryPoint,
    userOp,
    gasLimit,
    stateOverride,
    retryCount = 0,
  }: {
    entryPoint: Address;
    userOp: UserOperation;
    gasLimit?: bigint;
    stateOverride?: StateOverrides;
    retryCount?: number;
  }): Promise<
    | {
        result: "success";
        verificationGas: bigint;
        paymasterVerificationGas: bigint;
        executionResult: SimulateHandleOpSuccessResult;
      }
    | {
        result: "failed";
        data: string;
        code: number;
      }
  > {
    try {
      const packedTargetOp = packUserOp(userOp);
      const data = encodeFunctionData({
        abi: pimlicoSimulationsAbi,
        functionName: "simulateAndEstimateGas",
        args: [
          this.networkConfig.epSimulationsContract as Address,
          entryPoint,
          [],
          packedTargetOp,
          BigInt(9000),
          BigInt(10000),
          BigInt(30000000),
        ],
      });

      const result = await this.publicClient.request({
        method: "eth_call",
        params: [
          {
            to: this.networkConfig.pimlicoSimulationsContract as Address,
            data,
            gasLimit: gasLimit !== undefined ? toHex(gasLimit) : undefined,
          },
          "latest",
          stateOverride as any,
        ],
      });

      const decodedResult = decodeFunctionResult({
        abi: pimlicoSimulationsAbi,
        data: result,
        functionName: "simulateAndEstimateGas",
      });

      const {
        verificationGasLimit,
        paymasterVerificationGasLimit,
        simulationResult,
      } = decodedResult;

      // Check if verification gas limit needs retry
      let verificationGas: bigint;
      if (verificationGasLimit.resultType === BinarySearchResultType.OutOfGas) {
        const binarySearchResult = await this.performBinarySearch({
          entryPoint,
          methodName: "binarySearchVerificationGas",
          targetUserOp: userOp,
          stateOverride,
          retryCount: retryCount + 1,
          initialMinGas: verificationGasLimit.outOfGasData.minGas,
          gasAllowance: BigInt(
            verificationGasLimit.outOfGasData.optimalGas -
              verificationGasLimit.outOfGasData.minGas
          ),
        });

        if (binarySearchResult.result === "failed") {
          return binarySearchResult;
        }

        verificationGas = binarySearchResult.data.gasUsed;
      } else if (
        verificationGasLimit.resultType === BinarySearchResultType.Success
      ) {
        verificationGas = verificationGasLimit.successData.gasUsed;
      } else {
        return {
          result: "failed",
          data: verificationGasLimit.successData.returnData,
          code: RpcErrorCodes.EXECUTION_REVERTED,
        };
      }

      // Check if paymaster verification gas limit needs retry
      let paymasterVerificationGas: bigint;
      if (
        paymasterVerificationGasLimit.resultType ===
        BinarySearchResultType.OutOfGas
      ) {
        const binarySearchResult = await this.performBinarySearch({
          entryPoint,
          methodName: "binarySearchPaymasterVerificationGas",
          targetUserOp: userOp,
          stateOverride,
          retryCount: retryCount + 1,
          initialMinGas: paymasterVerificationGasLimit.outOfGasData.minGas,
          gasAllowance: BigInt(
            paymasterVerificationGasLimit.outOfGasData.optimalGas -
              paymasterVerificationGasLimit.outOfGasData.minGas
          ),
        });

        if (binarySearchResult.result === "failed") {
          return binarySearchResult;
        }

        paymasterVerificationGas = binarySearchResult.data.gasUsed;
      } else if (
        paymasterVerificationGasLimit.resultType ===
        BinarySearchResultType.Success
      ) {
        paymasterVerificationGas =
          paymasterVerificationGasLimit.successData.gasUsed;
      } else {
        return {
          result: "failed",
          data: paymasterVerificationGasLimit.successData.returnData,
          code: RpcErrorCodes.EXECUTION_REVERTED,
        };
      }

      return {
        result: "success",
        verificationGas,
        paymasterVerificationGas,
        executionResult: simulationResult,
      };
    } catch (error: any) {
      return {
        result: "failed",
        data: error.data,
        code: RpcErrorCodes.EXECUTION_REVERTED,
      };
    }
  }

  async simulateHandleOpUsingSimulatorContracts(
    userOp: UserOperation,
    stateOverrides?: StateOverrides
  ): Promise<SimulateHandleOpResultAndGasLimits> {
    const gasLimit = this.networkConfig.gasFeeInSimulation
      ? getUserOpGasLimit(
          userOp,
          BigInt(0),
          this.networkConfig.estimationGasLimit
        )
      : undefined;
    const [saegl, focgl] = await Promise.all([
      this.simulateAndEstimateGasLimits({
        entryPoint: this.address,
        userOp,
        stateOverride: userOp.eip7702Auth ? {
          ...stateOverrides,
          [userOp.sender]: {
            code: "0xef0100" + userOp.eip7702Auth.address.substring(2),
          },
        }: stateOverrides,
      }),
      this.performBinarySearch({
        entryPoint: this.address,
        methodName: "binarySearchCallGas",
        targetUserOp: userOp,
        stateOverride: userOp.eip7702Auth ? {
          ...stateOverrides,
          [userOp.sender]: {
            code: "0xef0100" + userOp.eip7702Auth.address.substring(2),
          },
        }: stateOverrides,
        gasLimit,
      }),
    ]);

    if (saegl.result === "failed") {
      throw new RpcError(
        decodeRevertReason(saegl.data) ?? "execution reverted",
        saegl.code
      );
    }

    if (focgl.result === "failed") {
      throw new RpcError(
        decodeRevertReason(focgl.data) ?? "execution reverted",
        focgl.code
      );
    }

    const { verificationGas, paymasterVerificationGas, executionResult } =
      saegl;

    return {
      callGasLimit: focgl.data.gasUsed,
      verificationGasLimit: verificationGas,
      paymasterVerificationGasLimit: paymasterVerificationGas,
      executionResult: executionResult,
    };
  }

  async simulateHandleOp(
    userOp: UserOperation,
    stateOverrides?: StateOverrides
  ): Promise<any> {
    const gasLimit = this.networkConfig.gasFeeInSimulation
      ? getUserOpGasLimit(
          userOp,
          BigInt(0),
          this.networkConfig.estimationGasLimit
        )
      : undefined;

    const estimateCallGasArgs = {
      userOp: packUserOp(userOp),
      isContinuation: true,
      maxGas: BigInt("20000000"),
      minGas: BigInt("21000"),
      rounding: BigInt("500"),
    };

    const [data] = this.encodeSimulateHandleOp(
      userOp,
      this.address,
      encodeFunctionData({
        abi: CallGasEstimationProxy__factory.abi,
        functionName: "estimateCallGas",
        args: [estimateCallGasArgs],
      })
    );

    const stateOverride: any = userOp.eip7702Auth
      ? {
          ...stateOverrides,
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
          ...stateOverrides,
          [this.address]: {
            code: _callGasEstimationProxyDeployedBytecode,
          },
          [IMPLEMENTATION_ADDRESS_MARKER]: {
            code: _deployedBytecode,
          },
        };
    try {
      const simulationResult = await this.publicClient.request({
        method: "eth_call",
        params: [
          {
            to: this.address,
            data,
            gasLimit: gasLimit !== undefined ? toHex(gasLimit) : undefined,
          },
          "latest",
          stateOverride,
        ],
      });

      const res = decodeFunctionResult({
        abi: IEntryPointSimulations__factory.abi,
        data: simulationResult,
        functionName: "simulateHandleOp",
      });

      return {
        returnInfo: res,
        callGasLimit: decodeTargetData(res.targetResult)[0],
      };
    } catch (error: any) {
      // eslint-disable-next-line no-console
      console.log(error);
      const err = decodeRevertReason(error);
      if (err != null) {
        throw new RpcError(err, RpcErrorCodes.EXECUTION_REVERTED);
      }
      throw error;
    }
  }

  async simulateValidation(userOp: UserOperation): Promise<any> {
    const [data, stateOverride] = this.encodeSimulateValidation(userOp);
    try {
      const errorResult = await this.publicClient.request({
        method: "eth_call",
        params: [{ to: this.address, data }, "latest", stateOverride],
      });
      return this.parseValidationResult(userOp, errorResult);
    } catch (error: any) {
      // eslint-disable-next-line no-console
      console.log(error);
      const decodedError = decodeRevertReason(error);
      if (decodedError != null) {
        throw new RpcError(decodedError, RpcErrorCodes.VALIDATION_FAILED);
      }
      throw error;
    }
  }

  getDepositInfo(address: Hex): Promise<{
    deposit: bigint;
    staked: boolean;
    stake: bigint;
    unstakeDelaySec: number;
    withdrawTime: number;
  }> {
    return this.contract.read.getDepositInfo([address]);
  }

  /******************************************/
  /** Write functions (return encoded data) */

  encodeHandleOps(userOps: UserOperation[], beneficiary: Hex): Hex {
    const packedUserOps = userOps.map((userOp) => packUserOp(userOp));
    return encodeFunctionData({
      abi: EntryPoint__factory.abi,
      functionName: "handleOps",
      args: [packedUserOps, beneficiary],
    });
  }

  encodeSimulateHandleOp(
    userOp: UserOperation,
    target: Hex,
    targetCallData: Hex
  ): [Hex, StateOverrides] {
    return [
      encodeFunctionData({
        abi: IEntryPointSimulations__factory.abi,
        functionName: "simulateHandleOp",
        args: [packUserOp(userOp), target, targetCallData],
      }),
      {
        [this.address.toLowerCase() as Address]: {
          code: _deployedBytecode,
        },
      },
    ];
  }

  encodeSimulateValidation(userOp: UserOperation): [Hex, any] {
    const functionData = encodeFunctionData({
      abi: IEntryPointSimulations__factory.abi,
      functionName: "simulateValidation",
      args: [packUserOp(userOp)],
    });
    return !userOp.eip7702Auth
      ? [
          functionData,
          {
            [this.address.toLowerCase()]: {
              code: _deployedBytecode,
            },
          },
        ]
      : [
          functionData,
          {
            [this.address.toLowerCase()]: {
              code: _deployedBytecode,
            },
            [userOp.sender.toLowerCase()]: {
              code: ("0xef0100" +
                userOp.eip7702Auth.address.substring(2)).toLowerCase() as Hex,
            },
          },
        ];
  }

  /******************/
  /** UserOp Events */

  async getUserOperationEvent(userOpHash: Hex) {
    try {
      const blockNumber = await this.publicClient.getBlockNumber();
      let fromBlock =
        blockNumber - BigInt(this.networkConfig.receiptLookupRange);
      // underflow check
      if (fromBlock < 0) {
        fromBlock = BigInt(0);
      }
      const logs = await this.publicClient.getLogs({
        address: this.address,
        event: parseAbiItem([
          "event UserOperationEvent(bytes32 indexed userOpHash, address indexed sender, address indexed paymaster, uint256 nonce, bool success, uint256 actualGasCost, uint256 actualGasUsed)",
        ]),
        fromBlock,
        args: {
          userOpHash,
        },
      });
      if (logs[0]) {
        return logs[0];
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
    hash: Hex
  ): Promise<UserOperationReceipt | null> {
    const event = await this.getUserOperationEvent(hash);
    if (!event) {
      return null;
    }
    const txHash = event.transactionHash;
    const receipt = await this.publicClient.getTransactionReceipt({
      hash: txHash,
    });
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
    hash: Hex
  ): Promise<UserOperationByHashResponse | null> {
    const event = await this.getUserOperationEvent(hash);
    if (!event) {
      return null;
    }
    const txHash = event.transactionHash;
    const tx = await this.publicClient.getTransaction({
      hash: txHash,
    });
    if (tx.to !== this.address.toLowerCase()) {
      throw new Error("unable to parse transaction");
    }

    const parsed = decodeFunctionData({
      abi: EntryPoint__factory.abi,
      data: tx.input,
    });
    const ops: PackedUserOperation[] = parsed?.args[0] as PackedUserOperation[];
    if (ops.length == 0) {
      throw new Error("failed to parse transaction");
    }

    const op = ops.find(
      (o) => o.sender === event.args.sender && o.nonce === event.args.nonce
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
    data: Hex
  ): UserOpValidationResult {
    const decoded = decodeFunctionResult({
      abi: EntryPointSimulations__factory.abi,
      data,
      functionName: "simulateValidation",
    });

    const mergedValidation = mergeValidationDataValues(
      decoded.returnInfo.accountValidationData,
      decoded.returnInfo.paymasterValidationData
    );
    function fillEntity(
      addr: string | undefined,
      info: {
        stake: bigint;
        unstakeDelaySec: bigint;
      }
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

  private filterLogs(userOpEvent: any, logs: Log[]): Log[] {
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
