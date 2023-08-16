import { IEntryPoint__factory } from "types/lib/executor/contracts";
import {
  IEntryPoint,
  UserOperationStruct,
} from "types/lib/executor/contracts/EntryPoint";
import { BigNumber, ethers, providers } from "ethers";
import { BundlerCollectorReturn, ExitInfo } from "types/lib/executor";
import RpcError from "types/lib/api/errors/rpc-error";
import * as RpcErrorCodes from "types/lib/api/errors/rpc-error-codes";
import { WhitelistedEntities } from "params/lib/whitelisted-entities";
import { NetworkName } from "types/lib";
import {
  IWhitelistedEntities,
  IWhitelistedEntity,
} from "params/lib/types/IWhitelistedEntities";
import {
  Logger,
  StorageMap,
  UserOpValidationResult,
} from "../../../interfaces";
import { GethTracer } from "../GethTracer";
import {
  callsFromEntryPointMethodSigs,
  isSlotAssociatedWith,
  parseCallStack,
  parseEntitySlots,
  parseErrorResult,
} from "../utils";
import { ReputationService } from "../../ReputationService";

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
]);

// REF: https://github.com/eth-infinitism/bundler/blob/main/packages/bundler/src/modules/ValidationManager.ts
export class SafeValidationService {
  private gethTracer: GethTracer;

  constructor(
    private provider: providers.Provider,
    private reputationService: ReputationService,
    private network: NetworkName,
    private logger: Logger
  ) {
    this.gethTracer = new GethTracer(
      this.provider as providers.JsonRpcProvider
    );
  }

  async validateSafely(
    userOp: UserOperationStruct,
    entryPoint: string,
    codehash?: string
  ): Promise<UserOpValidationResult> {
    const entryPointContract = IEntryPoint__factory.connect(
      entryPoint,
      this.provider
    );
    const simulationGas = BigNumber.from(userOp.preVerificationGas)
      .add(userOp.verificationGasLimit)
      .add(userOp.callGasLimit);

    const tx: providers.TransactionRequest = {
      to: entryPoint,
      data: entryPointContract.interface.encodeFunctionData(
        "simulateValidation",
        [userOp]
      ),
      gasLimit: simulationGas,
    };

    const traceCall: BundlerCollectorReturn =
      await this.gethTracer.debug_traceCall(tx);
    const validationResult = await this.validateOpcodesAndStake(
      traceCall,
      entryPointContract,
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
      if (stakeErr) {
        throw new RpcError(stakeErr, RpcErrorCodes.VALIDATION_FAILED);
      }
    }

    const prestateTrace = await this.gethTracer.debug_traceCallPrestate(tx);
    const addresses = traceCall.callsFromEntryPoint.flatMap((level) =>
      Object.keys(level.contractSize)
    );
    const code = addresses.map((addr) => prestateTrace[addr]?.code).join(";");
    const hash = ethers.utils.keccak256(
      ethers.utils.hexlify(ethers.utils.toUtf8Bytes(code))
    );

    if (codehash && codehash !== hash) {
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
    entryPointContract: IEntryPoint,
    userOp: UserOperationStruct
  ): Promise<UserOpValidationResult> {
    const entryPoint = entryPointContract.address.toLowerCase();
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
    if (lastResult.type !== "REVERT") {
      throw new RpcError(
        "Invalid response. simulateCall must revert",
        RpcErrorCodes.VALIDATION_FAILED
      );
    }
    const data = (lastResult as ExitInfo).data;
    const validationResult = this.parseValidationResult(
      entryPointContract,
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

      const whitelist: IWhitelistedEntity | undefined =
        WhitelistedEntities[entityTitle as keyof IWhitelistedEntities];
      if (
        entityAddr &&
        whitelist != null &&
        whitelist[this.network] &&
        whitelist[this.network]!.some(
          (addr) => addr === ethers.utils.getAddress(entityAddr)
        )
      ) {
        this.logger.debug(
          "Paymaster is in whitelist. Skipping opcode validation..."
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
            if (
              userOp.initCode.length > 2 &&
              !(
                entityAddr === sender &&
                (await this.reputationService.checkStake(
                  stakeInfoEntities.factory
                )) === null
              )
            ) {
              requireStakeSlot = slot;
            }
          } else if (isSlotAssociatedWith(slot, entityAddr, entitySlots)) {
            requireStakeSlot = slot;
          } else if (addr === entityAddr) {
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
          if (stake != null) {
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
          if (stake != null) {
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

      if (
        Object.keys(currentNumLevel.contractSize).find(
          (addr) => addr !== sender && currentNumLevel.contractSize[addr] <= 2
        ) != null
      ) {
        throw new RpcError(
          `${entityTitle} accesses un-deployed contract ${JSON.stringify(
            currentNumLevel.contractSize
          )}`,
          RpcErrorCodes.INVALID_OPCODE
        );
      }
    }

    return validationResult;
  }

  private parseValidationResult(
    entryPointContract: IEntryPoint,
    userOp: UserOperationStruct,
    data: string
  ): UserOpValidationResult {
    const { name: errorName, args: errorArgs } =
      entryPointContract.interface.parseError(data);
    const errFullName = `${errorName}(${errorArgs.toString()})`;
    const errResult = parseErrorResult(userOp, {
      errorName,
      errorArgs,
    });
    if (!errorName.includes("Result")) {
      throw new Error(errFullName);
    }
    return errResult;
  }
}
