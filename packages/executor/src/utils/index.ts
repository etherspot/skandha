import {
  BytesLike,
  defaultAbiCoder,
  hexlify,
  keccak256,
} from "ethers/lib/utils";
import { EntryPoint__factory } from "types/lib/executor/contracts/factories/EntryPoint__factory";
import { UserOperationStruct } from "types/lib/executor/contracts/EntryPoint";

const UserOpType = (
  EntryPoint__factory.abi.find(
    (entry: any) => entry.name === "simulateValidation"
  ) as any
).inputs?.[0];

if (UserOpType == null) {
  throw new Error("unable to find method simulateValidation in EntryPoint ABI");
}

function encode(
  typevalues: Array<{ type: string; val: any }>,
  forSignature: boolean
): string {
  const types = typevalues.map((typevalue) =>
    typevalue.type === "bytes" && forSignature ? "bytes32" : typevalue.type
  );
  const values = typevalues.map((typevalue: any) =>
    typevalue.type === "bytes" && forSignature
      ? keccak256(typevalue.val)
      : typevalue.val
  );
  return defaultAbiCoder.encode(types, values);
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
  const initCodeHash = keccak256(op.initCode);
  const callDataHash = keccak256(op.callData);
  const paymasterAndDataHash = keccak256(op.paymasterAndData);

  const userOp = {
    ...op,
    initCode: initCodeHash,
    callData: callDataHash,
    paymasterAndData: paymasterAndDataHash,
  };

  if (forSignature) {
    // lighter signature scheme (must match UserOperation#pack): do encode a zero-length signature, but strip afterwards the appended zero-length value
    const userOpType = {
      components: [
        {
          type: "address",
          name: "sender",
        },
        {
          type: "uint256",
          name: "nonce",
        },
        {
          type: "bytes32",
          name: "initCode",
        },
        {
          type: "bytes32",
          name: "callData",
        },
        {
          type: "uint256",
          name: "callGasLimit",
        },
        {
          type: "uint256",
          name: "verificationGasLimit",
        },
        {
          type: "uint256",
          name: "preVerificationGas",
        },
        {
          type: "uint256",
          name: "maxFeePerGas",
        },
        {
          type: "uint256",
          name: "maxPriorityFeePerGas",
        },
        {
          type: "bytes32",
          name: "paymasterAndData",
        },
        {
          type: "bytes",
          name: "signature",
        },
      ],
      name: "userOp",
      type: "tuple",
    };
    // console.log('hard-coded userOpType', userOpType)
    // console.log('from ABI userOpType', UserOpType)
    let encoded = defaultAbiCoder.encode(
      [userOpType as any],
      [
        {
          ...userOp,
          signature: "0x",
        },
      ]
    );
    // remove leading word (total length) and trailing word (zero-length signature)
    encoded = "0x" + encoded.slice(66, encoded.length - 64);
    return encoded;
  }

  const typevalues = (UserOpType as any).components.map(
    (c: { name: keyof typeof userOp; type: string }) => ({
      type: c.type,
      val: userOp[c.name],
    })
  );
  return encode(typevalues, forSignature);
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
