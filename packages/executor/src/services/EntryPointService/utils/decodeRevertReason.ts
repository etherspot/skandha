import { Interface } from "@ethersproject/abi";
import { ethers } from "ethers";
import { EntryPointSimulations__factory } from "@skandha/types/lib/contracts/EPv7/factories/core";
import { SimpleAccount__factory } from "@skandha/types/lib/contracts/EPv7/factories/samples";
import { IPaymaster__factory } from "@skandha/types/lib/contracts/EPv7/factories/interfaces";

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
    data = (err.data?.data ?? err.data ?? err.error.data) as string;
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

export function decodeTargetData(data: string) {
  try {
    const methodSig = data.slice(0, 10);
    const dataParams = "0x" + data.slice(10);
    if(methodSig === "0x8c83589a") {
      const res = ethers.utils.defaultAbiCoder.decode(
        ["uint256", "uint256"],
        dataParams
      );
      return res;
    }
    throw Error("Error decoding target data");
  } catch (error) {
    throw error;
  }
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
