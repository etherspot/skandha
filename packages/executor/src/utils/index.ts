import {
  BytesLike,
  defaultAbiCoder,
  hexlify,
  keccak256,
} from "ethers/lib/utils";
import { IEntryPoint__factory } from "types/lib/executor/contracts/factories";
import { UserOperationStruct } from "types/lib/executor/contracts/EntryPoint";

const UserOpType = (
  IEntryPoint__factory.abi.find(
    (entry: any) => entry.name === "simulateValidation"
  ) as any
).inputs?.[0];

if (UserOpType == null) {
  throw new Error("unable to find method simulateValidation in EntryPoint ABI");
}

/**
 * pack the userOperation
 * @param op
 * @param forSignature "true" if the hash is needed to calculate the getUserOpHash()
 *  "false" to pack entire UserOp, for calculating the calldata cost of putting it on-chain.
 */
export function packUserOp(
  op: UserOperationStruct,
  forSignature = true
): string {
  if (forSignature) {
    return defaultAbiCoder.encode(
      [
        "address",
        "uint256",
        "bytes32",
        "bytes32",
        "uint256",
        "uint256",
        "uint256",
        "uint256",
        "uint256",
        "bytes32",
      ],
      [
        op.sender,
        op.nonce,
        keccak256(op.initCode),
        keccak256(op.callData),
        op.callGasLimit,
        op.verificationGasLimit,
        op.preVerificationGas,
        op.maxFeePerGas,
        op.maxPriorityFeePerGas,
        keccak256(op.paymasterAndData),
      ]
    );
  } else {
    // for the purpose of calculating gas cost encode also signature (and no keccak of bytes)
    return defaultAbiCoder.encode(
      [
        "address",
        "uint256",
        "bytes",
        "bytes",
        "uint256",
        "uint256",
        "uint256",
        "uint256",
        "uint256",
        "bytes",
        "bytes",
      ],
      [
        op.sender,
        op.nonce,
        op.initCode,
        op.callData,
        op.callGasLimit,
        op.verificationGasLimit,
        op.preVerificationGas,
        op.maxFeePerGas,
        op.maxPriorityFeePerGas,
        op.paymasterAndData,
        op.signature,
      ]
    );
  }
}

/**
 * calculate the userOpHash of a given userOperation.
 * The userOpHash is a hash of all UserOperation fields, except the "signature" field.
 * The entryPoint uses this value in the emitted UserOperationEvent.
 * A wallet may use this value as the hash to sign (the SampleWallet uses this method)
 * @param op
 * @param entryPoint
 * @param chainId
 */
export function getUserOpHash(
  op: UserOperationStruct,
  entryPoint: string,
  chainId: number
): string {
  const userOpHash = keccak256(packUserOp(op, true));
  const enc = defaultAbiCoder.encode(
    ["bytes32", "address", "uint256"],
    [userOpHash, entryPoint, chainId]
  );
  return keccak256(enc);
}

/**
 * hexlify all members of object, recursively
 * @param obj
 */
export function deepHexlify(obj: any): any {
  if (typeof obj === "function") {
    return undefined;
  }
  if (obj == null || typeof obj === "string" || typeof obj === "boolean") {
    return obj;
    // eslint-disable-next-line no-underscore-dangle
  } else if (obj._isBigNumber != null || typeof obj !== "object") {
    return hexlify(obj).replace(/^0x0/, "0x");
  }
  if (Array.isArray(obj)) {
    return obj.map((member) => deepHexlify(member));
  }
  return Object.keys(obj).reduce(
    (set, key) => ({
      ...set,
      [key]: deepHexlify(obj[key]),
    }),
    {}
  );
}

export function extractAddrFromInitCode(data?: BytesLike): string | undefined {
  if (data == null) {
    return undefined;
  }
  const str = hexlify(data);
  if (str.length >= 42) {
    return str.slice(0, 42);
  }
  return undefined;
}

export function now(): number {
  return new Date().getTime();
}

export function getAddr(data?: BytesLike): string | undefined {
  if (data == null) {
    return undefined;
  }
  const str = hexlify(data);
  if (str.length >= 42) {
    return str.slice(0, 42);
  }
  return undefined;
}
