/* eslint-disable @typescript-eslint/strict-boolean-expressions */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { BigNumber, BytesLike } from "ethers";
import { Interface, hexZeroPad, hexlify, keccak256 } from "ethers/lib/utils";
import { BundlerCollectorReturn, CallEntry } from "@skandha/types/lib/executor";
import {
  IEntryPoint__factory,
  IPaymaster__factory,
  IAccount__factory,
} from "@skandha/types/lib/contracts/EPv7/factories/interfaces";
import { SenderCreator__factory } from "@skandha/types/lib/contracts/EPv7/factories/core";
import {
  AccessedSlots,
  ContractSizeInfo,
  NativeTracerReturn,
} from "@skandha/types/lib/executor/validation/nativeTracer";
import { Hex } from "viem";
import { StakeInfo } from "../../interfaces.js";

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

function callCatch<T, T1>(x: () => T, def: T1): T | T1 {
  try {
    return x();
  } catch {
    return def;
  }
}

function customERC7562TraceParser(
  tracerResults: BundlerCollectorReturn,
  xfaces: Interface
): CallEntry[] {
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
  return out;
}

function nativeERC7562TraceParser(
  tracerResults: NativeTracerReturn,
  xfaces: Interface,
  entryPoint: string,
  out: CallEntry[] = [],
  epTopLevelCalls: NativeTracerReturn[] = []
): [CallEntry[], NativeTracerReturn[]] {
  if (!tracerResults.calls) {
    return [out, epTopLevelCalls];
  }

  if (tracerResults.calls && epTopLevelCalls.length === 0) {
    for (const x of tracerResults.calls) {
      if (x.from === entryPoint) {
        epTopLevelCalls.push(x);
      }
    }
  }

  tracerResults.calls
    .filter((x) => !x.type.startsWith("depth"))
    .forEach((x) => {
      const method = callCatch(
        () => xfaces.getFunction(x.input.substring(0, 10)).name,
        x.input.substring(0, 10)
      );
      nativeERC7562TraceParser(x, xfaces, entryPoint, out, epTopLevelCalls);
      out.push({
        method,
        from: x.from,
        to: x.to,
        type: x.type,
        value: x.value ? (x.value as Hex) : undefined,
        return: x.error
          ? callCatch(() => xfaces.parseError(x.output), x.output)
          : callCatch(
              () => xfaces.decodeFunctionResult(method, x.output),
              x.output
            ),
      });
    });
  return [out, epTopLevelCalls];
}

/**
 * parse all call operation in the trace.
 * notes:
 * - entries are ordered by the return (so nested call appears before its outer call
 * - last entry is top-level return from "simulateValidation". it as ret and rettype, but no type or address
 * @param tracerResults
 */
export function parseCallStack<T>(
  tracerResults: BundlerCollectorReturn | NativeTracerReturn,
  nativeTracer: boolean,
  entryPoint: string
): T {
  const abi = Object.values(
    [
      ...IEntryPoint__factory.abi,
      ...IAccount__factory.abi,
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

  if (nativeTracer) {
    return nativeERC7562TraceParser(
      tracerResults as NativeTracerReturn,
      xfaces,
      entryPoint
    ) as T;
  }
  return customERC7562TraceParser(
    tracerResults as BundlerCollectorReturn,
    xfaces
  ) as T;
  // TODO: verify that stack is empty at the end.
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

export function getOpcodesInfo(
  call: NativeTracerReturn,
  usedOpCodes: { [key: string]: number } = {}
): { [opCode: string]: number } {
  if (!call) {
    return usedOpCodes;
  }

  for (const entry of Object.entries(call.usedOpcodes)) {
    if (usedOpCodes[entry[0]]) {
      usedOpCodes[entry[0]] = usedOpCodes[entry[0]] + entry[1];
    } else {
      usedOpCodes[entry[0]] = entry[1];
    }
  }

  if (call.calls) {
    for (const x of call.calls) {
      getOpcodesInfo(x, usedOpCodes);
    }
  }

  return usedOpCodes;
}

export function getReferencedContracts(
  calls: NativeTracerReturn[] | undefined,
  refrencedContracts: string[] = []
): string[] {
  if (!calls) {
    return refrencedContracts;
  }

  for (const x of calls) {
    const addresses = Object.keys(x.contractSize);
    refrencedContracts.push(...addresses);
    getReferencedContracts(x.calls);
  }

  return refrencedContracts;
}

export function getAccessInfo(
  call: NativeTracerReturn,
  accessInfo: { [address: string]: AccessedSlots } = {}
): {
  [address: string]: AccessedSlots;
} {
  if (!call) {
    return accessInfo;
  }

  const { reads, transientReads, transientWrites, writes } = call.accessedSlots;

  const addr = call.type === "DELEGATECALL" ? call.from : call.to;

  for (const x of Object.keys(reads)) {
    if (accessInfo[addr] && accessInfo[addr].reads?.[x]) {
      accessInfo[addr].reads[x] = [...accessInfo[addr].reads[x], ...reads[x]];
    } else {
      if (accessInfo[addr]) {
        accessInfo[addr].reads = {
          ...accessInfo[addr].reads,
          [x]: reads[x],
        };
      } else {
        accessInfo[addr] = {
          reads: {
            [x]: reads[x],
          },
          transientReads: {},
          writes: {},
          transientWrites: {},
        };
      }
    }
  }

  for (const x of Object.keys(transientReads)) {
    if (accessInfo[addr] && accessInfo[addr].transientReads?.[x]) {
      accessInfo[addr].transientReads[x] = [
        ...accessInfo[addr].transientReads[x],
        ...transientReads[x],
      ];
    } else {
      if (accessInfo[addr]) {
        accessInfo[addr].transientReads = {
          ...accessInfo[addr].transientReads,
          [x]: transientReads[x],
        };
      } else {
        accessInfo[addr] = {
          reads: {},
          transientReads: {
            [x]: transientReads[x],
          },
          writes: {},
          transientWrites: {},
        };
      }
    }
  }

  for (const x of Object.keys(writes)) {
    if (accessInfo[addr] && accessInfo[addr].writes?.[x]) {
      accessInfo[addr].writes[x] = accessInfo[addr].writes[x] + writes[x];
    } else {
      if (accessInfo[addr]) {
        accessInfo[addr].writes = {
          ...accessInfo[addr].writes,
          [x]: writes[x],
        };
      } else {
        accessInfo[addr] = {
          reads: {},
          transientReads: {},
          writes: {
            [x]: writes[x],
          },
          transientWrites: {},
        };
      }
    }
  }

  for (const x of Object.keys(transientWrites)) {
    if (accessInfo[addr] && accessInfo[addr].transientWrites?.[x]) {
      accessInfo[addr].transientWrites[x] =
        accessInfo[addr].transientWrites[x] + transientWrites[x];
    } else {
      if (accessInfo[addr]) {
        accessInfo[addr].transientWrites = {
          ...accessInfo[addr].transientWrites,
          [x]: transientWrites[x],
        };
      } else {
        accessInfo[addr] = {
          reads: {},
          transientReads: {},
          writes: {},
          transientWrites: {
            [x]: writes[x],
          },
        };
      }
    }
  }

  if (call.calls) {
    for (const x of call.calls) {
      getAccessInfo(x, accessInfo);
    }
  }

  return accessInfo;
}

export function getTopLevelEpCalls(
  tracerResults: NativeTracerReturn,
  entryPoint: string,
  epTopLevelCalls: NativeTracerReturn[] = []
): NativeTracerReturn[] {
  if (!tracerResults) {
    return epTopLevelCalls;
  }

  if (tracerResults.calls) {
    if (epTopLevelCalls.length === 0) {
      for (const x of tracerResults.calls) {
        if (x.from === entryPoint) {
          epTopLevelCalls.push(x);
        }
      }
    } else {
      for (const x of tracerResults.calls) {
        getTopLevelEpCalls(x, entryPoint, epTopLevelCalls);
      }
    }
  }

  return epTopLevelCalls;
}

export function getContractSizes(
  tracerResults: NativeTracerReturn,
  contractSizes: { [address: string]: ContractSizeInfo}
): { [address: string]: ContractSizeInfo } {
  if(!tracerResults) {
    return contractSizes;
  }

  contractSizes = {...contractSizes, ...tracerResults.contractSize};

  if(tracerResults.calls) {
    for (const x of tracerResults.calls) {
      contractSizes = {...contractSizes, ...getContractSizes(x, contractSizes)};
    }
  }

  return contractSizes
};

export function outOfGasExists(trace: NativeTracerReturn): boolean {
  if (trace.outOfGas) return true;
  if (trace.calls) {
    for (const x of trace.calls) {
      if (outOfGasExists(x)) return true;
    }
  }
  return false;
}


export function getExtCodeAccessInfos(
  tracerResults: NativeTracerReturn,
  extCodeAccessInfos: string[] = []
): string[] {
  if(!tracerResults) {
    return extCodeAccessInfos;
  }

  extCodeAccessInfos = [
    ...extCodeAccessInfos,
    ...tracerResults.extCodeAccessInfo
  ];

  if(tracerResults.calls) {
    for (const x of tracerResults.calls) {
      extCodeAccessInfos = [
        ...extCodeAccessInfos,
        ...getExtCodeAccessInfos(x, extCodeAccessInfos)
      ]
    }
  }

  return extCodeAccessInfos;
}
