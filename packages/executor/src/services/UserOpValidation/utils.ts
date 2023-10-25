import { BigNumber, BytesLike } from "ethers";
import { AddressZero } from "params/lib";
import RpcError from "types/lib/api/errors/rpc-error";
import {
  IEntryPoint,
  IEntryPoint__factory,
  IAccount__factory,
  IAggregatedAccount__factory,
  IAggregator__factory,
  IPaymaster__factory,
  SenderCreator__factory,
} from "types/lib/executor/contracts";
import { UserOperationStruct } from "types/lib/executor/contracts/EntryPoint";
import * as RpcErrorCodes from "types/lib/api/errors/rpc-error-codes";
import { Interface, hexZeroPad, hexlify, keccak256 } from "ethers/lib/utils";
import { BundlerCollectorReturn, CallEntry } from "types/lib/executor";
import { UserOpValidationResult, StakeInfo } from "../../interfaces";
import { getAddr } from "../../utils";

export function nonGethErrorHandler(
  epContract: IEntryPoint,
  errorResult: any
): any {
  try {
    let { error } = errorResult;
    if (error && error.error) {
      error = error.error;
    }
    if (error && error.code == -32015 && error.data.startsWith("Reverted ")) {
      /** NETHERMIND */
      const parsed = epContract.interface.parseError(error.data.slice(9));
      errorResult = {
        ...parsed,
        errorName: parsed.name,
        errorArgs: parsed.args,
      };
    } else if (error && error.code == -32603 && error.data) {
      /** BIFROST */
      const parsed = epContract.interface.parseError(error.data);
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

export function parseErrorResult(
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
  function fillEntity(data: BytesLike, info: StakeInfo): StakeInfo | undefined {
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

export function compareBytecode(
  artifactBytecode: string,
  contractBytecode: string
): number {
  if (artifactBytecode.length <= 2 || contractBytecode.length <= 2) return 0;

  if (typeof artifactBytecode === "string")
    artifactBytecode = artifactBytecode
      // eslint-disable-next-line no-useless-escape
      .replace(/\_\_\$/g, "000")
      // eslint-disable-next-line no-useless-escape
      .replace(/\$\_\_/g, "000");

  let matchedBytes = 0;
  for (let i = 0; i < artifactBytecode.length; i++) {
    if (artifactBytecode[i] === contractBytecode[i]) matchedBytes++;
  }
  if (isNaN(matchedBytes / artifactBytecode.length)) {
    return 0;
  }

  return matchedBytes / artifactBytecode.length;
}

export function toBytes32(b: BytesLike | number): string {
  return hexZeroPad(hexlify(b).toLowerCase(), 32);
}

export function requireCond(
  cond: boolean,
  msg: string,
  code?: number,
  data: any = undefined
): void {
  if (!cond) {
    throw new RpcError(msg, code, data);
  }
}

/**
 * parse all call operation in the trace.
 * notes:
 * - entries are ordered by the return (so nested call appears before its outer call
 * - last entry is top-level return from "simulateValidation". it as ret and rettype, but no type or address
 * @param tracerResults
 */
export function parseCallStack(
  tracerResults: BundlerCollectorReturn
): CallEntry[] {
  const abi = Object.values(
    [
      ...IEntryPoint__factory.abi,
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

  const xfaces = new Interface(abi);

  function callCatch<T, T1>(x: () => T, def: T1): T | T1 {
    try {
      return x();
    } catch {
      return def;
    }
  }

  const out: CallEntry[] = [];
  const stack: any[] = [];
  tracerResults.calls
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
            from: top.from,
            type: top.type,
            method: "",
            return: `len=${returnData.length}`,
          });
        } else {
          const method = callCatch(
            () => xfaces.getFunction(top.method),
            top.method
          );
          if (c.type === "REVERT") {
            const parsedError = callCatch(
              () => xfaces.parseError(returnData),
              returnData
            );
            out.push({
              to: top.to,
              from: top.from,
              type: top.type,
              method: method.name,
              value: top.value,
              revert: parsedError,
            });
          } else {
            const ret = callCatch(
              () => xfaces.decodeFunctionResult(method, returnData),
              returnData
            );
            out.push({
              to: top.to,
              from: top.from,
              type: top.type,
              value: top.value,
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

/**
 * slots associated with each entity.
 * keccak( A || ...) is associated with "A"
 * removed rule: keccak( ... || ASSOC ) (for a previously associated hash) is also associated with "A"
 *
 * @param stakeInfoEntities stake info for (factory, account, paymaster). factory and paymaster can be null.
 * @param keccak array of buffers that were given to keccak in the transaction
 */
export function parseEntitySlots(
  stakeInfoEntities: { [addr: string]: StakeInfo | undefined },
  keccak: string[]
): { [addr: string]: Set<string> } {
  // for each entity (sender, factory, paymaster), hold the valid slot addresses
  // valid: the slot was generated by keccak(entity || ...)
  const entitySlots: { [addr: string]: Set<string> } = {};

  keccak.forEach((k) => {
    Object.values(stakeInfoEntities).forEach((info) => {
      const addr = info?.addr?.toLowerCase();
      if (addr == null) return;
      const addrPadded = toBytes32(addr);
      if (entitySlots[addr] == null) {
        entitySlots[addr] = new Set<string>();
      }

      const currentEntitySlots = entitySlots[addr];

      if (k.startsWith(addrPadded)) {
        currentEntitySlots.add(keccak256(k));
      }
    });
  });

  return entitySlots;
}

export const callsFromEntryPointMethodSigs: { [key: string]: string } = {
  factory: SenderCreator__factory.createInterface().getSighash("createSender"),
  account: IAccount__factory.createInterface().getSighash("validateUserOp"),
  paymaster: IPaymaster__factory.createInterface().getSighash(
    "validatePaymasterUserOp"
  ),
};

// return true if the given slot is associated with the given address, given the known keccak operations:
// @param slot the SLOAD/SSTORE slot address we're testing
// @param addr - the address we try to check for association with
// @param reverseKeccak - a mapping we built for keccak values that contained the address
export function isSlotAssociatedWith(
  slot: string,
  addr: string,
  entitySlots: { [addr: string]: Set<string> }
): boolean {
  const addrPadded = hexZeroPad(addr, 32).toLowerCase();
  if (slot === addrPadded) {
    return true;
  }
  const k = entitySlots[addr];
  if (k == null) {
    return false;
  }
  const slotN = BigNumber.from(slot);
  // scan all slot entries to check of the given slot is within a structure, starting at that offset.
  // assume a maximum size on a (static) structure size.
  for (const k1 of k.keys()) {
    const kn = BigNumber.from(k1);
    if (slotN.gte(kn) && slotN.lt(kn.add(128))) {
      return true;
    }
  }
  return false;
}

export function parseValidationResult(
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
