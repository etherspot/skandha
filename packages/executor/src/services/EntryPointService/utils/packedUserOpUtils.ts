import { AddressZero } from "@skandha/params/lib";
import {
  UserOperation,
  PackedUserOperation,
} from "@skandha/types/lib/contracts/UserOperation";
import {
  pad,
  toHex,
  keccak256,
  concat,
  slice,
  size,
  Hex,
  hexToBigInt,
  encodeAbiParameters,
  hexToBytes
} from "viem";

type BigNumberish = bigint | number | `0x${string}` | `${number}` | string;


export function packAccountGasLimits(
  validationGasLimit: BigNumberish,
  callGasLimit: BigNumberish
): string {
  return packUint(validationGasLimit, callGasLimit);
}

export function unpackAccountGasLimits(accountGasLimits: Hex): {
  verificationGasLimit: bigint;
  callGasLimit: bigint;
} {
  const [verificationGasLimit, callGasLimit] = unpackUint(accountGasLimits);
  return { verificationGasLimit, callGasLimit };
}

export function packUint(high128: BigNumberish, low128: BigNumberish): Hex {
  const high = BigInt(high128);
  const low = BigInt(low128);

  const packed = (high << BigInt(128)) + low;

  return pad(toHex(packed), {size: 32});
}

export function unpackUint(
  packed: Hex
): [high128: bigint, low128: bigint] {
  const arr = hexToBytes(packed);
  return [
    BigInt(toHex(arr.slice(0, 16))),
    BigInt(toHex(arr.slice(16, 32)))
  ]
}

export function packPaymasterData(
  paymaster: Hex,
  paymasterVerificationGasLimit: BigNumberish,
  postOpGasLimit: BigNumberish,
  paymasterData?: Hex
): Hex {
  return concat([
    paymaster,
    packUint(paymasterVerificationGasLimit, postOpGasLimit),
    paymasterData ?? "0x",
  ]);
}

export interface ValidationData {
  aggregator: Hex;
  validAfter: number;
  validUntil: number;
}

export const maxUint48 = 2 ** 48 - 1;
export const SIG_VALIDATION_FAILED = pad("0x01", {size: 20});

/**
 * parse validationData as returned from validateUserOp or validatePaymasterUserOp into ValidationData struct
 * @param validationData
 */
export function parseValidationData(
  validationData: BigNumberish
): ValidationData {
  const data = pad(toHex(validationData), {size: 32});

  // string offsets start from left (msb)
  const aggregator = slice(data, 32 - 20);
  let validUntil = parseInt(slice(data, 32 - 26, 32 - 20));
  if (validUntil === 0) validUntil = maxUint48;
  const validAfter = parseInt(slice(data, 0, 6));

  return {
    aggregator,
    validAfter,
    validUntil,
  };
}

export function mergeValidationDataValues(
  accountValidationData: BigNumberish,
  paymasterValidationData: BigNumberish
): ValidationData {
  return mergeValidationData(
    parseValidationData(accountValidationData),
    parseValidationData(paymasterValidationData)
  );
}

/**
 * merge validationData structure returned by paymaster and account
 * @param accountValidationData returned from validateUserOp
 * @param paymasterValidationData returned from validatePaymasterUserOp
 */
export function mergeValidationData(
  accountValidationData: ValidationData,
  paymasterValidationData: ValidationData
): ValidationData {
  return {
    aggregator:
      paymasterValidationData.aggregator !== AddressZero
        ? SIG_VALIDATION_FAILED
        : accountValidationData.aggregator,
    validAfter: Math.max(
      accountValidationData.validAfter,
      paymasterValidationData.validAfter
    ),
    validUntil: Math.min(
      accountValidationData.validUntil,
      paymasterValidationData.validUntil
    ),
  };
}

export function packValidationData(validationData: ValidationData): BigInt {
  const validAfter = BigInt(validationData.validAfter) ?? BigInt(0);
  const validUntil = BigInt(validationData.validUntil) ?? BigInt(0);
  const aggregator = validationData.aggregator;

  return (validAfter << BigInt(48)) + validUntil + (BigInt(aggregator) << BigInt(160));
}
export function unpackPaymasterAndData(paymasterAndData: Hex): {
  paymaster: Hex;
  paymasterVerificationGas: BigNumberish;
  postOpGasLimit: BigNumberish;
  paymasterData: Hex;
} | null {
  if (paymasterAndData.length <= 2) return null;
  if (size(paymasterAndData) < 52) {
    // if length is non-zero, then must at least host paymaster address and gas-limits
    throw new Error(`invalid PaymasterAndData: ${paymasterAndData as string}`);
  }
  const [paymasterVerificationGas, postOpGasLimit] = unpackUint(
    slice(paymasterAndData, 20, 52)
  );
  return {
    paymaster: slice(paymasterAndData, 0, 20),
    paymasterVerificationGas,
    postOpGasLimit,
    paymasterData: slice(paymasterAndData, 52),
  };
}

export function packUserOp(op: UserOperation): PackedUserOperation {
  let paymasterAndData: Hex;
  if (op.paymaster == null) {
    paymasterAndData = "0x";
  } else {
    if (
      op.paymasterVerificationGasLimit == null ||
      op.paymasterPostOpGasLimit == null
    ) {
      throw new Error("paymaster with no gas limits");
    }
    paymasterAndData = packPaymasterData(
      op.paymaster,
      op.paymasterVerificationGasLimit,
      op.paymasterPostOpGasLimit,
      op.paymasterData
    );
  }
  return {
    sender: op.sender,
    nonce: BigInt(op.nonce),
    initCode:
      op.factory == null ? "0x" : concat([op.factory, op.factoryData ?? "0x"]),
    callData: op.callData,
    accountGasLimits: packUint(op.verificationGasLimit, op.callGasLimit),
    preVerificationGas: BigInt(op.preVerificationGas),
    gasFees: packUint(op.maxPriorityFeePerGas, op.maxFeePerGas),
    paymasterAndData,
    signature: op.signature,
  };
}

export function unpackUserOp(packed: PackedUserOperation): UserOperation {
  const [verificationGasLimit, callGasLimit] = unpackUint(
    packed.accountGasLimits
  );
  const [maxPriorityFeePerGas, maxFeePerGas] = unpackUint(packed.gasFees);

  let ret: UserOperation = {
    sender: packed.sender,
    nonce: packed.nonce,
    callData: packed.callData,
    preVerificationGas: packed.preVerificationGas,
    verificationGasLimit,
    callGasLimit,
    maxFeePerGas,
    maxPriorityFeePerGas,
    signature: packed.signature,
  };
  if (packed.initCode != null && packed.initCode.length > 2) {
    const factory = slice(packed.initCode, 0, 20);
    const factoryData = slice(packed.initCode, 20);
    ret = {
      ...ret,
      factory,
      factoryData,
    };
  }
  const pmData = unpackPaymasterAndData(packed.paymasterAndData);
  if (pmData != null) {
    ret = {
      ...ret,
      paymaster: pmData.paymaster,
      paymasterVerificationGasLimit: pmData.paymasterVerificationGas,
      paymasterPostOpGasLimit: pmData.postOpGasLimit,
      paymasterData: pmData.paymasterData,
    };
  }
  return ret;
}

/**
 * abi-encode the userOperation
 * @param op a PackedUserOp
 * @param forSignature "true" if the hash is needed to calculate the getUserOpHash()
 *  "false" to pack entire UserOp, for calculating the calldata cost of putting it on-chain.
 */
export function encodeUserOp(
  op1: PackedUserOperation | UserOperation,
  forSignature = true
): Hex {
  // if "op" is unpacked UserOperation, then pack it first, before we ABI-encode it.
  let op: PackedUserOperation;
  if ("callGasLimit" in op1) {
    op = packUserOp(op1);
  } else {
    op = op1;
  }
  if (forSignature) {
    return encodeAbiParameters(
      [
        {type: "address"},
        {type: "uint256"},
        {type: "bytes32"},
        {type: "bytes32"},
        {type: "bytes32"},
        {type: "uint256"},
        {type: "bytes32"},
        {type: "bytes32"},
      ],
      [
        op.sender,
        BigInt(op.nonce),
        keccak256(op.initCode),
        keccak256(op.callData),
        op.accountGasLimits,
        op.preVerificationGas,
        op.gasFees,
        keccak256(op.paymasterAndData)
      ]
    )
  } else {
    return encodeAbiParameters(
      [
        {type: "address"},
        {type: "uint256"},
        {type: "bytes"},
        {type: "bytes"},
        {type: "bytes32"},
        {type: "uint256"},
        {type: "bytes32"},
        {type: "bytes"},
        {type: "bytes"},
      ],
      [
        op.sender,
        BigInt(op.nonce),
        op.initCode,
        op.callData,
        op.accountGasLimits,
        op.preVerificationGas,
        op.gasFees,
        op.paymasterAndData,
        op.signature
      ]
    )
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
  op: UserOperation,
  entryPoint: Hex,
  chainId: number
): string {
  const userOpHash = keccak256(encodeUserOp(op, true));
  const enc = encodeAbiParameters(
    [{type: "bytes32"}, {type: "address"}, {type: "uint256"}],
    [userOpHash, entryPoint, BigInt(chainId)]
  )
  return keccak256(enc);
}
