/* eslint-disable @typescript-eslint/no-explicit-any */
import { Interface } from "@ethersproject/abi";
import { ethers } from "ethers";
import { EntryPointSimulations__factory } from "@skandha/types/lib/contracts/EPv7/factories/core";
import { SimpleAccount__factory } from "@skandha/types/lib/contracts/EPv7/factories/samples";
import { IPaymaster__factory } from "@skandha/types/lib/contracts/EPv7/factories/interfaces";
import { decodeAbiParameters, Hex, parseAbiParameters } from "viem";

const decodeRevertReasonContracts = new Interface(
  [
    ...EntryPointSimulations__factory.createInterface().fragments,
    ...IPaymaster__factory.createInterface().fragments,
    ...SimpleAccount__factory.createInterface().fragments,
  ].filter((f: any) => f.type === "error")
);

/**
 * helper to decode revert data into its string representation
 * @param data revert data or an exception thrown by eth_call
 * @param nullIfNoMatch true to return null if not found. otherwise, return input data as-is
 */
export function decodeRevertReason(
  data: string | Error,
  nullIfNoMatch = true
): string | null {
  if (typeof data !== "string") {
    const err = data as any;
    const extractedData = (err?.data?.data ?? err?.data ?? err?.error?.data ?? err?.error?.body ?? err?.body) as
      | string
      | undefined;
    if (typeof extractedData === "string") {
      data = extractedData;
    } else {
      // If we cannot extract revert data, either return null or a stringified error depending on flag
      if (!nullIfNoMatch) {
        try {
          return JSON.stringify(err);
        } catch {
          return String(err);
        }
      }
      return null;
    }
  }
  // Ensure we have a hex-encoded revert data string before slicing
  if (typeof data !== "string" || !data.startsWith("0x") || data.length < 10) {
    if (!nullIfNoMatch) {
      return data as string;
    }
    return null;
  }
  const methodSig = data.slice(0, 10);
  const dataParams = "0x" + data.slice(10);

  try {
    // would be nice to add these to above "decodeRevertReasonContracts", but we can't add Error(string) to xface...
    if (methodSig === "0x08c379a0") {
      const [err] = ethers.utils.defaultAbiCoder.decode(["string"], dataParams);
      // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
      return `Error(${err})`;
    } else if (methodSig === "0x4e487b71") {
      const [code] = ethers.utils.defaultAbiCoder.decode(
        ["uint256"],
        dataParams
      );
      return `Panic(${panicCodes[code] ?? code} + ')`;
    }
    const err = decodeRevertReasonContracts.parseError(data);
    // treat any error "bytes" argument as possible error to decode (e.g. FailedOpWithRevert, PostOpReverted)
    const args = err.args.map((arg: any, index) => {
      switch (err.errorFragment.inputs[index].type) {
        case "bytes":
          return decodeRevertReason(arg, false);
        case "string":
          return `"${arg as string}"`;
        default:
          return arg;
      }
    });
    return `${err.name}(${args.join(",")})`;
  } catch (e) {
    // throw new Error('unsupported errorSig ' + data)
    if (!nullIfNoMatch) {
      return data;
    }
    return null;
  }
}

export function decodeTargetData(data: string): readonly [bigint, bigint] {
  const methodSig = data.slice(0, 10);
  const dataParams: Hex = ("0x" + data.slice(10)) as Hex;
  if (methodSig === "0x8c83589a") {
    const result = decodeAbiParameters(
      parseAbiParameters("uint256, uint256"),
      dataParams
    );
    return result;
  }
  throw Error("Error decoding target data");
}

// not sure why ethers fail to decode revert reasons, not even "Error()" (and obviously, not custom errors)
export function rethrowWithRevertReason(e: Error): never {
  throw new Error(decodeRevertReason(e, false) as any);
}

const panicCodes: { [key: number]: string } = {
  // from https://docs.soliditylang.org/en/v0.8.0/control-structures.html
  0x01: "assert(false)",
  0x11: "arithmetic overflow/underflow",
  0x12: "divide by zero",
  0x21: "invalid enum value",
  0x22: "storage byte array that is incorrectly encoded",
  0x31: ".pop() on an empty array.",
  0x32: "array sout-of-bounds or negative index",
  0x41: "memory overflow",
  0x51: "zero-initialized variable of internal function type",
};
