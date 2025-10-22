/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  BundlerCollectorReturn,
  CallEntry,
  ExitInfo,
} from "@skandha/types/lib/executor/index.js";
import RpcError from "@skandha/types/lib/api/errors/rpc-error.js";
import * as RpcErrorCodes from "@skandha/types/lib/api/errors/rpc-error-codes.js";
import { Logger } from "@skandha/types/lib/index.js";
import { IWhitelistedEntities } from "@skandha/types/lib/executor/index.js";
import { UserOperation } from "@skandha/types/lib/contracts/UserOperation.js";
import { AddressZero, EVM_OPCODES } from "@skandha/params/lib/index.js";
import { GetGasPriceResponse } from "@skandha/types/lib/api/interfaces.js";
import {
  Hex,
  PublicClient,
  TransactionRequest,
  toHex,
  keccak256,
  toBytes,
  getAddress,
} from "viem";
import { NativeTracerReturn } from "@skandha/types/lib/executor/validation/nativeTracer.js";
import {
  NetworkConfig,
  StorageMap,
  UserOpValidationResult,
} from "../../../interfaces.js";
import { GethTracer } from "../GethTracer.js";
import {
  callsFromEntryPointMethodSigs,
  getAccessInfo,
  getContractSizes,
  getExtCodeAccessInfos,
  getOpcodesInfo,
  getReferencedContracts,
  getTopLevelEpCalls,
  isSlotAssociatedWith,
  outOfGasExists,
  parseCallStack,
  parseEntitySlots,
} from "../utils.js";
import { ReputationService } from "../../ReputationService.js";
import { EntryPointService } from "../../EntryPointService/index.js";
import { decodeRevertReason } from "../../EntryPointService/utils/decodeRevertReason.js";
import { Skandha } from "../../../modules/index.js";
import { MempoolService } from "../../MempoolService/index.js";

/**
 * Some opcodes like:
 * - CREATE2
 * are not included here because they are handled elsewhere.
 * Do not include them in this list!!!
 */
const bannedOpCodes = new Set([
  "GASPRICE",
  "GASLIMIT",
  "DIFFICULTY",
  "TIMESTAMP",
  "BASEFEE",
  "BLOCKHASH",
  "NUMBER",
  "SELFBALANCE",
  "BALANCE",
  "ORIGIN",
  "GAS",
  "COINBASE",
  "SELFDESTRUCT",
  "RANDOM",
  "PREVRANDAO",
  "INVALID",
  "BLOBHASH",
  "BLOBBASEFEE",
]);

// REF: https://github.com/eth-infinitism/bundler/blob/main/packages/bundler/src/modules/ValidationManager.ts
export class SafeValidationService {
  private gethTracer: GethTracer;

  constructor(
    private skandhaUtils: Skandha,
    private publicClient: PublicClient,
    private entryPointService: EntryPointService,
    private reputationService: ReputationService,
    private mempoolService: MempoolService,
    private chainId: number,
    private networkConfig: NetworkConfig,
    private logger: Logger
  ) {
    this.gethTracer = new GethTracer(publicClient, networkConfig);
  }

  async validateSafely(
    userOp: UserOperation,
    entryPoint: Hex,
    codehash?: string
  ): Promise<UserOpValidationResult> {
    entryPoint = entryPoint.toLowerCase() as Hex;

    const simulationGas =
      BigInt(userOp.preVerificationGas) +
      BigInt(userOp.verificationGasLimit) +
      BigInt(userOp.callGasLimit);

    let gasPrice: GetGasPriceResponse | null = null;
    if (this.networkConfig.gasFeeInSimulation) {
      gasPrice = await this.skandhaUtils.getGasPrice();
      gasPrice.maxFeePerGas = toHex(gasPrice.maxFeePerGas);
      gasPrice.maxPriorityFeePerGas = toHex(gasPrice.maxPriorityFeePerGas);
    }

    const [data, stateOverrides] =
      this.entryPointService.encodeSimulateValidation(entryPoint, userOp);
    const tx: TransactionRequest = {
      to: entryPoint,
      data,
      gas: simulationGas,
      from: AddressZero,
    };

    const traceCall: BundlerCollectorReturn | NativeTracerReturn =
      await this.gethTracer
        .debug_traceCall(tx, stateOverrides)
        .catch((error) => {
          this.logger.error(error, "Debug trace call failed");
          throw new Error("debug_traceCall_failed");
        });
    const validationResult = await this.validateOpcodesAndStake(
      traceCall,
      entryPoint,
      userOp
    );

    const { returnInfo } = validationResult;
    if (returnInfo.sigFailed) {
      throw new RpcError(
        "Invalid UserOp signature or paymaster signature",
        RpcErrorCodes.INVALID_SIGNATURE
      );
    }

    if (userOp.paymaster) {
      const depositInfo = await this.entryPointService.balanceOf(
        entryPoint,
        userOp.paymaster
      );

      const pendingUserOps =
        await this.mempoolService.getPendingUserOpsByPaymaster(
          userOp.paymaster
        );

      let pendingPrefunds = BigInt("0");
      for (const op of pendingUserOps) {
        pendingPrefunds = pendingPrefunds + BigInt(op.prefund);
      }

      if (depositInfo < pendingPrefunds + BigInt(returnInfo.prefund)) {
        throw new RpcError(
          "Paymaster deposit too low",
          RpcErrorCodes.PAYMASTER_DEPOSIT_TOO_LOW
        );
      }
    }

    const now = Math.floor(Date.now() / 1000);
    if (returnInfo.validUntil != null && returnInfo.validUntil < now) {
      this.logger.debug(returnInfo);
      throw new RpcError(
        `already expired - ${returnInfo.validUntil}`,
        RpcErrorCodes.USEROP_EXPIRED
      );
    }

    if (returnInfo.validAfter != null && returnInfo.validAfter > now + 30) {
      this.logger.debug(returnInfo, "returnInfo");
      throw new RpcError(
        `expires too soon - ${returnInfo.validAfter}`,
        RpcErrorCodes.USEROP_EXPIRED
      );
    }

    if (validationResult.aggregatorInfo != null) {
      const stakeErr = await this.reputationService.checkStake(
        validationResult.aggregatorInfo
      );
      if (stakeErr.msg) {
        throw new RpcError(stakeErr.msg, RpcErrorCodes.VALIDATION_FAILED);
      }
    }

    let hash = "",
      addresses: string[] = [];
    try {
      const prestateTrace = await this.gethTracer.debug_traceCallPrestate(
        tx,
        stateOverrides
      );
      if (this.networkConfig.nativeTracer) {
        addresses = getReferencedContracts(
          (traceCall as NativeTracerReturn).calls
        );
      } else {
        addresses = (
          traceCall as BundlerCollectorReturn
        ).callsFromEntryPoint.flatMap((level) =>
          Object.keys(level.contractSize)
        );
      }
      const code = addresses.map((addr) => prestateTrace[addr]?.code).join(";");
      hash = keccak256(toHex(toBytes(code)));
    } catch (err) {
      this.logger.debug(`Error in prestate tracer: ${err}`);
    }

    if (hash && codehash && codehash !== hash) {
      throw new RpcError(
        "modified code after first validation",
        RpcErrorCodes.INVALID_OPCODE
      );
    }

    const storageMap: StorageMap = {};
    if (this.networkConfig.nativeTracer) {
      const topLevelEpCalls = getTopLevelEpCalls(
        traceCall as NativeTracerReturn,
        entryPoint
      );
      topLevelEpCalls.forEach((level) => {
        const accessInfo = getAccessInfo(level);
        Object.keys(accessInfo).forEach((addr) => {
          storageMap[addr] = storageMap[addr] ?? accessInfo[addr].reads;
        });
      });
    } else {
      (traceCall as BundlerCollectorReturn).callsFromEntryPoint.forEach(
        (level) => {
          Object.keys(level.access).forEach((addr) => {
            storageMap[addr] = storageMap[addr] ?? level.access[addr].reads;
          });
        }
      );
    }

    return {
      ...validationResult,
      referencedContracts: {
        addresses,
        hash,
      },
      storageMap,
    };
  }

  private async validateCustomTracerResult(
    traceCall: BundlerCollectorReturn,
    entryPoint: string,
    userOp: UserOperation
  ): Promise<UserOpValidationResult> {
    let belongsToCanonicalMempool = true; // false if some entity is in whitelist

    if (traceCall == null || traceCall.callsFromEntryPoint == undefined) {
      throw new Error(
        "Could not validate transaction. Tracing is not available"
      );
    }

    if (Object.values(traceCall.callsFromEntryPoint).length < 1) {
      throw new RpcError(
        "Unexpected traceCall result: no calls from entrypoint.",
        RpcErrorCodes.INTERNAL_ERROR
      );
    }

    const callStack = parseCallStack(
      traceCall,
      this.networkConfig.nativeTracer,
      entryPoint
    ) as CallEntry[];

    const callIntoEntryPoint = callStack.find(
      (call) =>
        call.to === entryPoint &&
        call.from !== entryPoint &&
        call.method !== "0x" &&
        call.method !== "depositTo"
    );

    if (callIntoEntryPoint != null && callIntoEntryPoint.method) {
      throw new RpcError(
        `illegal call into EntryPoint during validation ${callIntoEntryPoint.method}`,
        RpcErrorCodes.INVALID_OPCODE
      );
    }

    if (
      callStack.some(
        ({ to, value }) => to !== entryPoint && BigInt(value ?? 0) > BigInt(0)
      )
    ) {
      throw new RpcError(
        "May not may CALL with value",
        RpcErrorCodes.INVALID_OPCODE
      );
    }

    const sender = userOp.sender.toLowerCase();

    // Parse error result from the last call
    const lastResult = traceCall.calls.at(-1) as ExitInfo;
    if (lastResult.type === "REVERT") {
      throw new RpcError(
        decodeRevertReason(lastResult.data, false) ?? "Validation failed",
        RpcErrorCodes.VALIDATION_FAILED
      );
    }
    const data = (lastResult as ExitInfo).data;
    const validationResult = this.entryPointService.parseValidationResult(
      entryPoint,
      userOp,
      data
    );

    const stakeInfoEntities = {
      factory: validationResult.factoryInfo,
      account: validationResult.senderInfo,
      paymaster: validationResult.paymasterInfo,
    };

    const entitySlots: { [addr: string]: Set<string> } = parseEntitySlots(
      stakeInfoEntities,
      traceCall.keccak
    );

    for (const [entityTitle, entStakes] of Object.entries(stakeInfoEntities)) {
      const entityAddr = (entStakes?.addr || "").toLowerCase();
      const currentNumLevel = traceCall.callsFromEntryPoint.find(
        (info) =>
          info.topLevelMethodSig === callsFromEntryPointMethodSigs[entityTitle]
      );
      if (currentNumLevel == null) {
        if (entityTitle === "account") {
          throw new RpcError(
            "missing trace into validateUserOp",
            RpcErrorCodes.EXECUTION_REVERTED
          );
        }
        continue;
      }
      const opcodes = currentNumLevel.opcodes;

      const access = currentNumLevel.access;

      if (currentNumLevel.oog) {
        throw new RpcError(
          `${entityTitle} internally reverts on oog`,
          RpcErrorCodes.INVALID_OPCODE
        );
      }

      try {
        Object.keys(opcodes).forEach((opcode) => {
          if (
            (opcode === "BALANCE" || opcode === "SELFBALANCE") &&
            BigInt(entStakes?.stake || 0) > this.networkConfig.minStake
          ) {
            return;
          }
          if (bannedOpCodes.has(opcode)) {
            throw new RpcError(
              `${entityTitle} uses banned opcode: ${opcode}`,
              RpcErrorCodes.INVALID_OPCODE
            );
          }
        });

        if (entityTitle !== "factory" && opcodes.CREATE > 0) {
          throw new RpcError(
            `${entityTitle} uses banned opcode: CREATE`,
            RpcErrorCodes.INVALID_OPCODE
          );
        }

        // Special case for CREATE2
        if (entityTitle === "factory") {
          if (opcodes.CREATE2 > 1) {
            throw new RpcError(
              `${entityTitle} with too many CREATE2`,
              RpcErrorCodes.INVALID_OPCODE
            );
          }
        } else {
          if (opcodes.CREATE2 > 0) {
            throw new RpcError(
              `${entityTitle} uses banned opcode: CREATE2`,
              RpcErrorCodes.INVALID_OPCODE
            );
          }
        }

        for (const [addr, { reads, writes }] of Object.entries(access)) {
          if (addr === sender) {
            continue;
          }

          if (addr === entryPoint) {
            continue;
          }

          // eslint-disable-next-line no-inner-declarations
          function nameAddr(addr: string, _currentEntity: string): string {
            const [title] =
              Object.entries(stakeInfoEntities).find(
                // eslint-disable-next-line @typescript-eslint/no-unused-vars
                ([title, info]) =>
                  info?.addr.toLowerCase() === addr.toLowerCase()
              ) ?? [];

            return title ?? addr;
          }

          let requireStakeSlot: string | undefined;
          for (const slot of [...Object.keys(writes), ...Object.keys(reads)]) {
            if (isSlotAssociatedWith(slot, sender, entitySlots)) {
              if (userOp.factory) {
                const stake = await this.reputationService.checkStake(
                  stakeInfoEntities.factory
                );
                if (!(entityAddr === sender && stake.code === 0)) {
                  requireStakeSlot = slot;
                }
              }
            } else if (isSlotAssociatedWith(slot, entityAddr, entitySlots)) {
              requireStakeSlot = slot;
            } else if (addr === entityAddr) {
              requireStakeSlot = slot;
            } else if (writes[slot] == null) {
              requireStakeSlot = slot;
            } else {
              const readWrite = Object.keys(writes).includes(addr)
                ? "write to"
                : "read from";
              throw new RpcError(
                // eslint-disable-next-line prettier/prettier
                `${entityTitle} has forbidden ${readWrite} ${nameAddr(
                  addr,
                  entityTitle
                )} slot ${slot}`,
                RpcErrorCodes.INVALID_OPCODE,
                {
                  [entityTitle]: entStakes?.addr,
                  accessed: addr,
                }
              );
            }
          }

          if (requireStakeSlot != null) {
            const stake = await this.reputationService.checkStake(entStakes);
            if (stake.code != 0) {
              throw new RpcError(
                `unstaked ${entityTitle} accessed ${nameAddr(
                  addr,
                  entityTitle
                )} slot ${requireStakeSlot}`,
                RpcErrorCodes.INVALID_OPCODE,
                {
                  [entityTitle]: entStakes?.addr,
                  accessed: addr,
                }
              );
            }
          }
        }

        for (const addr of Object.keys(currentNumLevel.contractSize)) {
          if (
            addr !== sender &&
            currentNumLevel.contractSize[addr].contractSize <= 2 &&
            !this.networkConfig.precompiles.includes(addr.toLowerCase())
          ) {
            const { opcode } = currentNumLevel.contractSize[addr];
            throw new RpcError(
              `${entityTitle} accesses un-deployed contract address ${addr} with opcode ${opcode}`,
              RpcErrorCodes.INVALID_OPCODE
            );
          }
        }

        for (const addr of Object.keys(currentNumLevel.extCodeAccessInfo)) {
          if (addr === entryPoint) {
            throw new RpcError(
              `${entityTitle} accesses EntryPoint contract address ${addr} with opcode ${currentNumLevel.extCodeAccessInfo[addr]}`,
              RpcErrorCodes.INVALID_OPCODE
            );
          }
        }
      } catch (err: any) {
        // check external entities whitelist
        if (err instanceof RpcError) {
          const accessed = err?.data?.accessed;
          const externalEntities =
            this.networkConfig.whitelistedEntities.external;
          if (
            accessed &&
            externalEntities != null &&
            externalEntities.some(
              (entity: any) => getAddress(entity) === getAddress(accessed)
            )
          ) {
            belongsToCanonicalMempool = this.networkConfig.relayOpsWithWhitelistedEntities ? true : false;
            this.logger.debug(
              `${err.message}; ${accessed} is in whitelist. Skipping opcode validation...`
            );
            continue;
          }
          if (accessed && err?.data && typeof err.data === "object") {
            delete (err.data as any).accessed;
          }
        }
        // check whitelisted accounts, paymasters & factories
        const whitelist =
          this.networkConfig.whitelistedEntities[
            entityTitle as keyof IWhitelistedEntities
          ];
        if (
          entityAddr &&
          whitelist != null &&
          whitelist.some(
            (addr: any) => getAddress(addr) === getAddress(entityAddr)
          )
        ) {
          belongsToCanonicalMempool = this.networkConfig.relayOpsWithWhitelistedEntities ? true : false;;
          this.logger.debug(
            `${entityTitle} is in whitelist. Skipping opcode validation...`
          );
          continue;
        }

        // if entity is not whitelisted, bubble up the error
        throw err;
      }
    }

    return {
      ...validationResult,
      belongsToCanonicalMempool,
    };
  }

  private async validateNativeTracerResult(
    traceCall: NativeTracerReturn,
    entryPoint: string,
    userOp: UserOperation
  ): Promise<UserOpValidationResult> {
    let belongsToCanonicalMempool = true; // false if some entity is in whitelist

    if (traceCall == null) {
      throw new Error(
        "Could not validate transaction. Tracing is not available"
      );
    }

    const [callStack, epTopLevelCalls] = parseCallStack<
      [CallEntry[], NativeTracerReturn[]]
    >(traceCall, this.networkConfig.nativeTracer, entryPoint);

    const callIntoEntryPoint = callStack.find(
      (call) =>
        call.to === entryPoint &&
        call.from !== entryPoint &&
        call.method !== "0x" &&
        call.method !== "depositTo"
    );

    if (callIntoEntryPoint != null && callIntoEntryPoint.method) {
      throw new RpcError(
        `illegal call into EntryPoint during validation ${callIntoEntryPoint.method}`,
        RpcErrorCodes.INVALID_OPCODE
      );
    }

    if (
      callStack.some(
        ({ to, value }) => to !== entryPoint && BigInt(value ?? 0) > BigInt(0)
      )
    ) {
      throw new RpcError(
        "May not may CALL with value",
        RpcErrorCodes.INVALID_OPCODE
      );
    }
    const sender = userOp.sender.toLowerCase();
    const lastResult = traceCall.output;

    if (traceCall.error) {
      throw new RpcError(
        decodeRevertReason(lastResult, false) ?? "Validation failed",
        RpcErrorCodes.VALIDATION_FAILED
      );
    }

    const validationResult = this.entryPointService.parseValidationResult(
      entryPoint,
      userOp,
      lastResult
    );
    const stakeInfoEntities = {
      factory: validationResult.factoryInfo,
      account: validationResult.senderInfo,
      paymaster: validationResult.paymasterInfo,
    };
    const entitySlots: { [addr: string]: Set<string> } = parseEntitySlots(
      stakeInfoEntities,
      traceCall.keccak
    );

    for (const [entityTitle, entStakes] of Object.entries(stakeInfoEntities)) {
      const entityAddr = (entStakes?.addr || "").toLowerCase();
      const currentNumLevel = epTopLevelCalls.find(
        (info) =>
          info.input.substring(0, 10) ===
          callsFromEntryPointMethodSigs[entityTitle]
      );

      if (!currentNumLevel) {
        if (entityTitle === "account") {
          throw new RpcError(
            "missing trace into validateUserOp",
            RpcErrorCodes.EXECUTION_REVERTED
          );
        }
        continue;
      }

      const opcodes = getOpcodesInfo(currentNumLevel);

      const access = getAccessInfo(currentNumLevel);

      const isOutOfGas = outOfGasExists(currentNumLevel);

      if (isOutOfGas) {
        throw new RpcError(
          `${entityTitle} internally reverts on oog`,
          RpcErrorCodes.INVALID_OPCODE
        );
      }

      try {
        Object.keys(opcodes).forEach((opcode) => {
          if (bannedOpCodes.has(EVM_OPCODES[opcode])) {
            if (
              (EVM_OPCODES[opcode] === "BALANCE" ||
                EVM_OPCODES[opcode] === "SELFBALANCE") &&
              BigInt(entStakes?.stake || 0) > this.networkConfig.minStake
            ) {
              return;
            }
            throw new RpcError(
              `${entityTitle} uses banned opcode: ${EVM_OPCODES[opcode]}`,
              RpcErrorCodes.INVALID_OPCODE
            );
          }
        });

        if (entityTitle !== "factory" && opcodes["0xf0"] > 0) {
          throw new RpcError(
            `${entityTitle} uses banned opcode: CREATE`,
            RpcErrorCodes.INVALID_OPCODE
          );
        }

        // Special case for CREATE2
        if (entityTitle === "factory") {
          if (opcodes["0xf5"] > 1) {
            throw new RpcError(
              `${entityTitle} with too many CREATE2`,
              RpcErrorCodes.INVALID_OPCODE
            );
          }
        } else {
          if (opcodes["0xf5"] > 0) {
            throw new RpcError(
              `${entityTitle} uses banned opcode: CREATE2`,
              RpcErrorCodes.INVALID_OPCODE
            );
          }
        }

        for (const [
          addr,
          { reads, writes, transientReads, transientWrites },
        ] of Object.entries(access)) {
          if (addr === sender) {
            continue;
          }

          if (addr === entryPoint) {
            continue;
          }

          // eslint-disable-next-line no-inner-declarations
          function nameAddr(addr: string, _currentEntity: string): string {
            const [title] =
              Object.entries(stakeInfoEntities).find(
                // eslint-disable-next-line @typescript-eslint/no-unused-vars
                ([title, info]) =>
                  info?.addr.toLowerCase() === addr.toLowerCase()
              ) ?? [];

            return title ?? addr;
          }

          let requireStakeSlot: string | undefined;
          for (const slot of [
            ...Object.keys(writes),
            ...Object.keys(reads),
            ...Object.keys(transientReads),
            ...Object.keys(transientWrites),
          ]) {
            if (isSlotAssociatedWith(slot, sender, entitySlots)) {
              if (userOp.factory) {
                const stake = await this.reputationService.checkStake(
                  stakeInfoEntities.factory
                );
                if (!(entityAddr === sender && stake.code === 0)) {
                  requireStakeSlot = slot;
                }
              }
            } else if (isSlotAssociatedWith(slot, entityAddr, entitySlots)) {
              requireStakeSlot = slot;
            } else if (addr === entityAddr) {
              requireStakeSlot = slot;
            } else if (writes[slot] == null) {
              requireStakeSlot = slot;
            } else {
              const readWrite = Object.keys(writes).includes(addr)
                ? "write to"
                : "read from";
              throw new RpcError(
                // eslint-disable-next-line prettier/prettier
                `${entityTitle} has forbidden ${readWrite} ${nameAddr(
                  addr,
                  entityTitle
                )} slot ${slot}`,
                RpcErrorCodes.INVALID_OPCODE,
                {
                  [entityTitle]: entStakes?.addr,
                  accessed: addr,
                }
              );
            }
          }

          if (requireStakeSlot != null) {
            const stake = await this.reputationService.checkStake(entStakes);
            if (stake.code != 0) {
              throw new RpcError(
                `unstaked ${entityTitle} accessed ${nameAddr(
                  addr,
                  entityTitle
                )} slot ${requireStakeSlot}`,
                RpcErrorCodes.INVALID_OPCODE,
                {
                  [entityTitle]: entStakes?.addr,
                  accessed: addr,
                }
              );
            }
          }
        }

        const contractSizes = getContractSizes(currentNumLevel, {});
        for (const addr of Object.keys(contractSizes)) {
          if (
            addr !== sender &&
            contractSizes[addr].contractSize <= 2 &&
            !this.networkConfig.precompiles.includes(addr.toLowerCase())
          ) {
            const { opcode } = contractSizes[addr];
            throw new RpcError(
              `${entityTitle} accesses un-deployed contract address ${addr} with opcode ${
                EVM_OPCODES["0x" + Number(opcode).toString(16)]
              }`,
              RpcErrorCodes.INVALID_OPCODE
            );
          }
        }

        const extCodeAccessInfos = getExtCodeAccessInfos(currentNumLevel, []);
        for (const addr of extCodeAccessInfos) {
          if (addr === entryPoint) {
            throw new RpcError(
              `${entityTitle} accesses EntryPoint contract address ${addr}`,
              RpcErrorCodes.INVALID_OPCODE
            );
          }
        }
      } catch (err: any) {
        if (err instanceof RpcError) {
          const accessed = err?.data?.accessed;
          const externalEntities =
            this.networkConfig.whitelistedEntities.external;
          if (
            accessed &&
            externalEntities != null &&
            externalEntities.some(
              (entity: any) => getAddress(entity) === getAddress(accessed)
            )
          ) {
            belongsToCanonicalMempool = this.networkConfig.relayOpsWithWhitelistedEntities ? true : false;;
            this.logger.debug(
              `${err.message}; ${accessed} is in whitelist. Skipping opcode validation...`
            );
            continue;
          }
          if (accessed && err?.data && typeof err.data === "object") {
            delete (err.data as any).accessed;
          }
        }
        // check whitelisted accounts, paymasters & factories
        const whitelist =
          this.networkConfig.whitelistedEntities[
            entityTitle as keyof IWhitelistedEntities
          ];
        if (
          entityAddr &&
          whitelist != null &&
          whitelist.some(
            (addr: any) => getAddress(addr) === getAddress(entityAddr)
          )
        ) {
          belongsToCanonicalMempool = this.networkConfig.relayOpsWithWhitelistedEntities ? true : false;;
          this.logger.debug(
            `${entityTitle} is in whitelist. Skipping opcode validation...`
          );
          continue;
        }

        // if entity is not whitelisted, bubble up the error
        throw err;
      }
    }

    return {
      ...validationResult,
      belongsToCanonicalMempool,
    };
  }

  private async validateOpcodesAndStake(
    traceCall: BundlerCollectorReturn | NativeTracerReturn,
    entryPoint: string,
    userOp: UserOperation
  ): Promise<UserOpValidationResult> {
    if (this.networkConfig.nativeTracer) {
      return this.validateNativeTracerResult(
        traceCall as NativeTracerReturn,
        entryPoint,
        userOp
      );
    }
    return this.validateCustomTracerResult(
      traceCall as BundlerCollectorReturn,
      entryPoint,
      userOp
    );
  }
}
