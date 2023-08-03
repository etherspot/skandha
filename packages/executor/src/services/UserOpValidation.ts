import { BytesLike, ethers, providers } from "ethers";
import { Interface, getAddress, hexZeroPad } from "ethers/lib/utils";
import * as RpcErrorCodes from "types/lib/api/errors/rpc-error-codes";
import RpcError from "types/lib/api/errors/rpc-error";
import { EntryPoint__factory } from "types/lib/executor/contracts/factories";
import {
  IAccount__factory,
  IAggregatedAccount__factory,
  IAggregator__factory,
} from "types/lib/executor/contracts";
import { IPaymaster__factory } from "types/lib/executor/contracts/factories/IPaymaster__factory";
import {
  EntryPoint,
  UserOperationStruct,
} from "types/lib/executor/contracts/EntryPoint";
import { BannedContracts } from "params/lib";
import { NetworkName } from "types/lib";
import { AddressZero, BytesZero } from "params/lib";
import { WhitelistedEntities } from "params/lib/whitelisted-entities";
import { getAddr } from "../utils";
import {
  Logger,
  NetworkConfig,
  SlotMap,
  StakeInfo,
  StorageMap,
  TracerCall,
  TracerResult,
  UserOpValidationResult,
} from "../interfaces";
import { Config } from "../config";
import { ReputationService } from "./ReputationService";
import { GethTracer } from "./GethTracer";

export class UserOpValidationService {
  private gethTracer: GethTracer;
  private networkConfig: NetworkConfig;

  constructor(
    private provider: providers.Provider,
    private reputationService: ReputationService,
    private network: NetworkName,
    private config: Config,
    private logger: Logger
  ) {
    this.gethTracer = new GethTracer(
      this.provider as providers.JsonRpcProvider
    );
    const networkConfig = config.getNetworkConfig(network);
    if (!networkConfig) {
      throw new Error(`No config found for ${network}`);
    }
    this.networkConfig = networkConfig;
  }

  async validateForEstimation(
    userOp: UserOperationStruct,
    entryPoint: string
  ): Promise<any> {
    const entryPointContract = EntryPoint__factory.connect(
      entryPoint,
      this.provider
    );

    const tx = {
      to: entryPoint,
      data: entryPointContract.interface.encodeFunctionData(
        "simulateHandleOp",
        [userOp, AddressZero, BytesZero]
      ),
    };

    const errorResult = await entryPointContract.callStatic
      .simulateHandleOp(userOp, AddressZero, BytesZero)
      .catch((e: any) => this.nethermindErrorHandler(entryPointContract, e));

    if (errorResult.errorName === "FailedOp") {
      this.logger.debug(tx);
      throw new RpcError(
        errorResult.errorArgs.at(-1),
        RpcErrorCodes.VALIDATION_FAILED
      );
    }

    if (errorResult.errorName !== "ExecutionResult") {
      this.logger.debug(tx);
      throw errorResult;
    }

    return errorResult.errorArgs;
  }

  async simulateValidation(
    userOp: UserOperationStruct,
    entryPoint: string,
    codehash?: string
  ): Promise<UserOpValidationResult> {
    if (this.config.unsafeMode) {
      return this.simulateUnsafeValidation(userOp, entryPoint);
    }
    return this.simulateSafeValidation(userOp, entryPoint, codehash);
  }

  async simulateUnsafeValidation(
    userOp: UserOperationStruct,
    entryPoint: string
  ): Promise<UserOpValidationResult> {
    const { validationGasLimit } = this.networkConfig;
    const entryPointContract = EntryPoint__factory.connect(
      entryPoint,
      this.provider
    );
    const errorResult = await entryPointContract.callStatic
      .simulateValidation(userOp, {
        gasLimit: validationGasLimit,
      })
      .catch((e: any) => this.nethermindErrorHandler(entryPointContract, e));
    return this.parseErrorResult(userOp, errorResult);
  }

  async simulateSafeValidation(
    userOp: UserOperationStruct,
    entryPoint: string,
    codehash?: string
  ): Promise<UserOpValidationResult> {
    const { validationGasLimit } = this.networkConfig;

    entryPoint = entryPoint.toLowerCase();
    const entryPointContract = EntryPoint__factory.connect(
      entryPoint,
      this.provider
    );
    const tx = {
      to: entryPoint,
      data: entryPointContract.interface.encodeFunctionData(
        "simulateValidation",
        [userOp]
      ),
      gasLimit: 6e6,
    };
    const traceCall: TracerResult = await this.gethTracer.debug_traceCall(tx);
    if (traceCall == null || traceCall.calls == undefined) {
      throw new Error(
        "Could not validate transaction. Tracing is not available"
      );
    }

    // TODO: restrict calling EntryPoint methods except fallback and depositTo if depth > 2

    const lastCall = traceCall.calls.at(-1);
    if (!lastCall || lastCall.type !== "REVERT") {
      throw new Error("Invalid response. simulateCall must revert");
    }

    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const errorResult = await entryPointContract.callStatic
      .simulateValidation(userOp, { gasLimit: validationGasLimit })
      .catch((e: any) => e);
    // const errorResult = entryPointContract.interface.parseError(lastCall.data!);
    const validationResult = this.parseErrorResult(userOp, errorResult);
    const stakeInfoEntities = {
      factory: validationResult.factoryInfo,
      account: validationResult.senderInfo,
      paymaster: validationResult.paymasterInfo,
    };

    // OPCODE VALIDATION
    // eslint-disable-next-line prefer-const
    for (let [address, trace] of Object.entries(traceCall.trace)) {
      address = address.toLowerCase();
      const title = this.numberToEntityTitle(
        trace?.number
      ) as keyof typeof stakeInfoEntities;
      // OPCODE RULES
      const violation = trace.violation || {};

      // Skip whitelisted entities
      const whitelist = WhitelistedEntities[title];
      if (
        whitelist &&
        whitelist[this.network] &&
        whitelist[this.network]!.some((addr) => addr === getAddress(address))
      ) {
        this.logger.debug(
          "Paymaster is in whitelist. Skipping opcode validation..."
        );
        continue;
      }

      for (const [opcode, count] of Object.entries(violation)) {
        if (opcode === "CREATE2" && Number(count) < 2 && title === "factory") {
          continue;
        }
        throw new RpcError(
          `${title} uses banned opcode: ${opcode}`,
          RpcErrorCodes.INVALID_OPCODE
        );
      }
      const value = trace.value ?? 0;
      if (value > 0 && entryPoint !== address) {
        throw new RpcError(
          "May not may CALL with value",
          RpcErrorCodes.INVALID_OPCODE
        );
      }
    }

    // SLOT & STAKE VALIDATION
    // and fill storageMap
    const storageMap: StorageMap = {};

    // eslint-disable-next-line prefer-const
    for (let [address, trace] of Object.entries(traceCall.trace)) {
      address = address.toLowerCase();
      const title = this.numberToEntityTitle(
        trace?.number
      ) as keyof typeof stakeInfoEntities;
      const entity = stakeInfoEntities[title];

      // fill storageMap
      if (trace.storage != undefined && Object.keys(trace.storage).length > 0) {
        const map: SlotMap = {};
        for (const slot of Object.keys(trace.storage)) {
          if (slot[0] !== "l") continue;
          const key = `0${slot.slice(1)}`; // replace l and s to 0
          map[key] = trace.storage[slot] as string;
        }
        storageMap[address] = map;
      }

      const isSlotAssociatedWith = (slot: string, addr: string): boolean => {
        if (!trace.keccak) {
          return false;
        }
        const addrPadded = hexZeroPad(addr.toLowerCase(), 32);
        const keccak = Object.keys(trace.keccak).find((k) =>
          k.startsWith(addrPadded)
        );
        if (!keccak) {
          return false;
        }
        const kSlot = ethers.BigNumber.from(`0x${trace.keccak[keccak]}`);
        const bnSlot = ethers.BigNumber.from(slot);
        return bnSlot.gte(kSlot) && bnSlot.lt(kSlot.add(128));
      };
      const { paymaster, account } = stakeInfoEntities;
      if (address === entryPoint) {
        continue;
      }
      if (address === account.addr.toLowerCase()) {
        continue;
      }

      let validationFailed = false;
      if (address === paymaster?.addr.toLowerCase()) {
        if (trace.storage && Object.values(trace.storage).length) {
          validationFailed = true;
        }
      }

      if (!trace.storage) {
        continue;
      }

      if (!validationFailed) {
        for (let slot of Object.keys(trace.storage)) {
          slot = `0${slot.slice(1)}`; // replace l and s with 0
          if (isSlotAssociatedWith(slot, account.addr)) {
            validationFailed = userOp.initCode.length > 2;
          } else if (isSlotAssociatedWith(slot, entity?.addr ?? "")) {
            validationFailed = true;
          } else if (address.toLowerCase() === entity?.addr!.toLowerCase()) {
            validationFailed = true;
          } else {
            throw new RpcError(
              `unstaked ${title} entity ${address} accessed slot`,
              RpcErrorCodes.INVALID_OPCODE,
              {
                [title]: address,
              }
            );
          }
        }
      }

      if (validationFailed) {
        const unstaked =
          !entity || (await this.reputationService.checkStake(entity));
        if (unstaked != null) {
          throw new RpcError(
            `unstaked ${title} entity ${address} accessed slot`,
            RpcErrorCodes.INVALID_OPCODE,
            {
              [title]: address,
            }
          );
        }
      }
    }

    const parsedCalls = this.parseCalls(traceCall.calls);

    const { paymaster } = stakeInfoEntities;
    for (const call of parsedCalls) {
      if (!call.to) {
        continue;
      }

      if (call.to.toLowerCase() === paymaster?.addr.toLowerCase()) {
        // unstaked paymaster must not return context
        if (
          call.method === "validatePaymasterUserOp" &&
          call.return?.context !== "0x"
        ) {
          const checkStake = await this.reputationService.checkStake(
            paymaster!
          );
          if (checkStake) {
            throw new RpcError(
              "unstaked paymaster must not return context",
              RpcErrorCodes.INVALID_OPCODE,
              {
                paymaster: paymaster!.addr,
              }
            );
          }
        }
      }

      if (this.isContractBanned(this.network, call.to)) {
        throw new RpcError(
          `access to restricted precompiled contract ${call.to}`,
          RpcErrorCodes.VALIDATION_FAILED
        );
      }
    }

    if (validationResult.returnInfo.sigFailed) {
      throw new RpcError(
        "Invalid UserOp signature or paymaster signature",
        RpcErrorCodes.INVALID_SIGNATURE
      );
    }

    if (
      validationResult.returnInfo.deadline != null ||
      validationResult.returnInfo.deadline + 30 >= Date.now() / 1000
    ) {
      throw new RpcError("expires too soon", RpcErrorCodes.USEROP_EXPIRED);
    }

    if (validationResult.aggregatorInfo) {
      const stakeErr = await this.reputationService.checkStake(
        validationResult.aggregatorInfo
      );
      if (stakeErr) {
        throw new RpcError(stakeErr, RpcErrorCodes.VALIDATION_FAILED);
      }
    }

    const prestateTrace = await this.gethTracer.debug_traceCallPrestate(tx);
    const addresses = Object.keys(prestateTrace)
      .sort()
      .filter((addr) => traceCall!.trace[addr]);
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

    return {
      ...validationResult,
      referencedContracts: {
        addresses,
        hash,
      },
      storageMap,
    };
  }

  parseErrorResult(
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
    function fillEntity(data: BytesLike, info: StakeInfo): StakeInfo {
      const addr = getAddr(data);
      return addr == null
        ? null
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

  private parseCallsABI = Object.values(
    [
      ...EntryPoint__factory.abi,
      ...IAccount__factory.abi,
      ...IAggregatedAccount__factory.abi,
      ...IAggregator__factory.abi,
      ...IPaymaster__factory.abi,
    ].reduce((set, entry: any) => {
      const key = `${entry.name}(${entry?.inputs
        ?.map((i: any) => i.type)
        .join(",")})`;
      return {
        ...set,
        [key]: entry,
      };
    }, {})
  ) as any;

  private parseCallXfaces = new Interface(this.parseCallsABI);

  parseCalls(calls: TracerCall[]): TracerCall[] {
    function callCatch<T, T1>(x: () => T, def: T1): T | T1 {
      try {
        return x();
      } catch {
        return def;
      }
    }

    const out: TracerCall[] = [];
    const stack: any[] = [];
    calls
      .filter((x) => !x.type.startsWith("depth"))
      .forEach((c) => {
        if (c.type.match(/REVERT|RETURN/) != null) {
          const top = stack.splice(-1)[0] ?? {
            type: "top",
            method: "validateUserOp",
          };
          const returnData: string = (c as any).data;
          if (top.type.match(/CREATE/) != null) {
            out.push({
              to: top.to,
              type: top.type,
              method: "",
              return: `len=${returnData.length}`,
            });
          } else {
            const method = callCatch(
              () => this.parseCallXfaces.getFunction(top.method),
              top.method
            );
            if (c.type === "REVERT") {
              const parsedError = callCatch(
                () => this.parseCallXfaces.parseError(returnData),
                returnData
              );
              out.push({
                to: top.to,
                type: top.type,
                method: method.name,
                value: top.value,
                revert: parsedError,
              });
            } else {
              const ret = callCatch(
                () =>
                  this.parseCallXfaces.decodeFunctionResult(method, returnData),
                returnData
              );
              out.push({
                to: top.to,
                type: top.type,
                method: method.name ?? method,
                return: ret,
              });
            }
          }
        } else {
          stack.push(c);
        }
      });

    // TODO: verify that stack is empty at the end.

    return out;
  }

  numberToEntityTitle(id?: number): string {
    if (id == null) {
      id = 0;
    }
    const map: { [id: number]: string } = {
      0: "factory",
      1: "account",
      2: "paymaster",
    };
    return map[id] || map[0]!;
  }

  isContractBanned(network: NetworkName, address: string): boolean {
    const bannedList = BannedContracts[network];
    if (!bannedList || bannedList.length == 0) {
      return false;
    }
    try {
      address = ethers.utils.getAddress(ethers.utils.hexZeroPad(address, 20));
      return (
        bannedList.findIndex((addr) => {
          return (
            ethers.utils.getAddress(ethers.utils.hexZeroPad(addr, 20)) ==
            address
          );
        }) !== -1
      );
    } catch (err) {
      return false;
    }
  }

  nethermindErrorHandler(epContract: EntryPoint, errorResult: any): any {
    try {
      let { error } = errorResult;
      if (error.error) {
        error = error.error;
      }
      if (error && error.code == -32015 && error.data.startsWith("Reverted ")) {
        const parsed = epContract.interface.parseError(error.data.slice(9));
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
}
