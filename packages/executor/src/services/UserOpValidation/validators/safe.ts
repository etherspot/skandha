import { BigNumber, ethers, providers } from "ethers";
import { BundlerCollectorReturn, ExitInfo } from "types/lib/executor";
import RpcError from "types/lib/api/errors/rpc-error";
import * as RpcErrorCodes from "types/lib/api/errors/rpc-error-codes";
import { Logger } from "types/lib";
import { IWhitelistedEntities } from "types/lib/executor";
import { UserOperation } from "types/lib/contracts/UserOperation";
import {
  NetworkConfig,
  StorageMap,
  UserOpValidationResult,
} from "../../../interfaces";
import { GethTracer } from "../GethTracer";
import {
  callsFromEntryPointMethodSigs,
  isSlotAssociatedWith,
  parseCallStack,
  parseEntitySlots,
} from "../utils";
import { ReputationService } from "../../ReputationService";
import { EntryPointService } from "../../EntryPointService";
import { AddressZero } from "params/lib";
import { decodeRevertReason } from "../../EntryPointService/utils/decodeRevertReason";

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
  "CREATE",
  "COINBASE",
  "SELFDESTRUCT",
  "RANDOM",
  "PREVRANDAO",
  "INVALID",
]);

// REF: https://github.com/eth-infinitism/bundler/blob/main/packages/bundler/src/modules/ValidationManager.ts
export class SafeValidationService {
  private gethTracer: GethTracer;

  constructor(
    private provider: providers.Provider,
    private entryPointService: EntryPointService,
    private reputationService: ReputationService,
    private chainId: number,
    private networkConfig: NetworkConfig,
    private logger: Logger
  ) {
    this.gethTracer = new GethTracer(
      this.provider as providers.JsonRpcProvider
    );
  }

  async validateSafely(
    userOp: UserOperation,
    entryPoint: string,
    codehash?: string
  ): Promise<UserOpValidationResult> {
    entryPoint = entryPoint.toLowerCase();
    const simulationGas = BigNumber.from(userOp.preVerificationGas)
      .add(userOp.verificationGasLimit)
      .add(userOp.callGasLimit);

    const [data, stateOverrides] = this.entryPointService.encodeSimulateValidation(entryPoint, userOp);
    const tx: providers.TransactionRequest = {
      to: entryPoint,
      data,
      gasLimit: simulationGas,
      from: AddressZero
    }

    const traceCall: BundlerCollectorReturn =
      await this.gethTracer.debug_traceCall(tx, stateOverrides);
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

    const now = Math.floor(Date.now() / 1000);
    if (returnInfo.validUntil != null && returnInfo.validUntil < now) {
      throw new RpcError("already expired", RpcErrorCodes.USEROP_EXPIRED);
    }

    if (returnInfo.validAfter != null && returnInfo.validAfter > now + 30) {
      throw new RpcError("expires too soon", RpcErrorCodes.USEROP_EXPIRED);
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
      const prestateTrace = await this.gethTracer.debug_traceCallPrestate(tx, stateOverrides);
      addresses = traceCall.callsFromEntryPoint.flatMap((level) =>
        Object.keys(level.contractSize)
      );
      const code = addresses.map((addr) => prestateTrace[addr]?.code).join(";");
      hash = ethers.utils.keccak256(
        ethers.utils.hexlify(ethers.utils.toUtf8Bytes(code))
      );
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
    traceCall.callsFromEntryPoint.forEach((level) => {
      Object.keys(level.access).forEach((addr) => {
        storageMap[addr] = storageMap[addr] ?? level.access[addr].reads;
      });
    });

    return {
      ...validationResult,
      referencedContracts: {
        addresses,
        hash,
      },
      storageMap,
    };
  }

  private async validateOpcodesAndStake(
    traceCall: BundlerCollectorReturn,
    entryPoint: string,
    userOp: UserOperation
  ): Promise<UserOpValidationResult> {
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

    const callStack = parseCallStack(traceCall);

    const callInfoEntryPoint = callStack.find(
      (call) =>
        call.to === entryPoint &&
        call.from !== entryPoint &&
        call.method !== "0x" &&
        call.method !== "depositTo"
    );

    if (callInfoEntryPoint != null) {
      throw new RpcError(
        `illegal call into EntryPoint during validation ${callInfoEntryPoint?.method}`,
        RpcErrorCodes.INVALID_OPCODE
      );
    }

    if (
      callStack.some(
        ({ to, value }) => to !== entryPoint && BigNumber.from(value ?? 0).gt(0)
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
      throw new RpcError(decodeRevertReason(lastResult.data, false) ?? "Validation failed", RpcErrorCodes.VALIDATION_FAILED);
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

      const whitelist =
        this.networkConfig.whitelistedEntities[
          entityTitle as keyof IWhitelistedEntities
        ];
      if (
        entityAddr &&
        whitelist != null &&
        // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
        whitelist.some(
          (addr) =>
            ethers.utils.getAddress(addr) ===
            ethers.utils.getAddress(entityAddr)
        )
      ) {
        this.logger.debug(
          `${entityTitle} is in whitelist. Skipping opcode validation...`
        );
        continue;
      }

      Object.keys(opcodes).forEach((opcode) => {
        if (bannedOpCodes.has(opcode)) {
          throw new RpcError(
            `${entityTitle} uses banned opcode: ${opcode}`,
            RpcErrorCodes.INVALID_OPCODE
          );
        }
      });

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
              ([title, info]) => info?.addr.toLowerCase() === addr.toLowerCase()
            ) ?? [];

          return title ?? addr;
        }

        let requireStakeSlot: string | undefined;
        for (const slot of [...Object.keys(writes), ...Object.keys(reads)]) {
          if (isSlotAssociatedWith(slot, sender, entitySlots)) {
            if (userOp.factory) {
              const stake = await this.reputationService.checkStake(stakeInfoEntities.factory);
              if (!(entityAddr === sender && stake.code === 0)) {
                requireStakeSlot = slot
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
              `${entityTitle} has forbidden ${readWrite} ${nameAddr(addr, entityTitle)} slot ${slot}`,
              RpcErrorCodes.INVALID_OPCODE,
              {
                [entityTitle]: entStakes?.addr,
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
              }
            );
          }
        }
      }

      if (entityTitle === "paymaster") {
        const validatePaymasterUserOp = callStack.find(
          (call) =>
            call.method === "validatePaymasterUserOp" && call.to === entityAddr
        );
        const context = validatePaymasterUserOp?.return?.context;
        if (context != null && context !== "0x") {
          const stake = await this.reputationService.checkStake(entStakes);
          if (stake.code != 0) {
            throw new RpcError(
              "unstaked paymaster must not return context",
              RpcErrorCodes.INVALID_OPCODE,
              {
                [entityTitle]: entStakes?.addr,
              }
            );
          }
        }
      }

      for (const addr of Object.keys(currentNumLevel.contractSize)) {
        if (
          addr !== sender &&
          currentNumLevel.contractSize[addr].contractSize <= 2
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
    }

    return validationResult;
  }
}
