import { BigNumberish, BigNumber, BytesLike, ethers } from "ethers";
import {
  hexZeroPad,
  hexDataLength,
  hexDataSlice,
  hexConcat,
  defaultAbiCoder,
  keccak256,
} from "ethers/lib/utils";
import { AddressZero } from "@skandha/params/lib";
import { UserOperation, PackedUserOperation } from "@skandha/types/lib/contracts/UserOperation";

export function packAccountGasLimits (validationGasLimit: BigNumberish, callGasLimit: BigNumberish): string {
  return packUint(validationGasLimit, callGasLimit)
}

export function unpackAccountGasLimits (accountGasLimits: BytesLike): {
  verificationGasLimit: BigNumber
  callGasLimit: BigNumber
} {
  const [verificationGasLimit, callGasLimit] = unpackUint(accountGasLimits)
  return { verificationGasLimit, callGasLimit }
}

export function packUint (high128: BigNumberish, low128: BigNumberish): string {
  return hexZeroPad(BigNumber.from(high128).shl(128).add(low128).toHexString(), 32)
}

export function unpackUint (packed: BytesLike): [high128: BigNumber, low128: BigNumber] {
  const packedNumber: BigNumber = BigNumber.from(packed)
  return [packedNumber.shr(128), packedNumber.and(BigNumber.from(1).shl(128).sub(1))]
}

export function packPaymasterData (paymaster: string, paymasterVerificationGasLimit: BigNumberish, postOpGasLimit: BigNumberish, paymasterData?: BytesLike): BytesLike {
  return ethers.utils.hexConcat([
    paymaster,
    packUint(paymasterVerificationGasLimit, postOpGasLimit),
    paymasterData ?? '0x'
  ])
}

export interface ValidationData {
  aggregator: string
  validAfter: number
  validUntil: number
}

export const maxUint48 = (2 ** 48) - 1
export const SIG_VALIDATION_FAILED = hexZeroPad('0x01', 20)

/**
 * parse validationData as returned from validateUserOp or validatePaymasterUserOp into ValidationData struct
 * @param validationData
 */
export function parseValidationData (validationData: BigNumberish): ValidationData {
  const data = hexZeroPad(BigNumber.from(validationData).toHexString(), 32)

  // string offsets start from left (msb)
  const aggregator = hexDataSlice(data, 32 - 20)
  let validUntil = parseInt(hexDataSlice(data, 32 - 26, 32 - 20))
  if (validUntil === 0) validUntil = maxUint48
  const validAfter = parseInt(hexDataSlice(data, 0, 6))

  return {
    aggregator,
    validAfter,
    validUntil
  }
}

export function mergeValidationDataValues (accountValidationData: BigNumberish, paymasterValidationData: BigNumberish): ValidationData {
  return mergeValidationData(
    parseValidationData(accountValidationData),
    parseValidationData(paymasterValidationData)
  )
}

/**
 * merge validationData structure returned by paymaster and account
 * @param accountValidationData returned from validateUserOp
 * @param paymasterValidationData returned from validatePaymasterUserOp
 */
export function mergeValidationData (accountValidationData: ValidationData, paymasterValidationData: ValidationData): ValidationData {
  return {
    aggregator: paymasterValidationData.aggregator !== AddressZero ? SIG_VALIDATION_FAILED : accountValidationData.aggregator,
    validAfter: Math.max(accountValidationData.validAfter, paymasterValidationData.validAfter),
    validUntil: Math.min(accountValidationData.validUntil, paymasterValidationData.validUntil)
  }
}

export function packValidationData (validationData: ValidationData): BigNumber {
  return BigNumber.from(validationData.validAfter ?? 0).shl(48)
    .add(validationData.validUntil ?? 0).shl(160)
    .add(validationData.aggregator)
}

export function unpackPaymasterAndData (paymasterAndData: BytesLike): {
  paymaster: string
  paymasterVerificationGas: BigNumber
  postOpGasLimit: BigNumber
  paymasterData: BytesLike
} | null {
  if (paymasterAndData.length <= 2) return null
  if (hexDataLength(paymasterAndData) < 52) {
    // if length is non-zero, then must at least host paymaster address and gas-limits
    throw new Error(`invalid PaymasterAndData: ${paymasterAndData as string}`)
  }
  const [paymasterVerificationGas, postOpGasLimit] = unpackUint(hexDataSlice(paymasterAndData, 20, 52))
  return {
    paymaster: hexDataSlice(paymasterAndData, 0, 20),
    paymasterVerificationGas,
    postOpGasLimit,
    paymasterData: hexDataSlice(paymasterAndData, 52)
  }
}

export function packUserOp (op: UserOperation): PackedUserOperation {
  let paymasterAndData: BytesLike
  if (op.paymaster == null) {
    paymasterAndData = '0x'
  } else {
    if (op.paymasterVerificationGasLimit == null || op.paymasterPostOpGasLimit == null) {
      throw new Error('paymaster with no gas limits')
    }
    paymasterAndData = packPaymasterData(op.paymaster, op.paymasterVerificationGasLimit, op.paymasterPostOpGasLimit, op.paymasterData)
  }
  return {
    sender: op.sender,
    nonce: BigNumber.from(op.nonce).toHexString(),
    initCode: op.factory == null ? '0x' : hexConcat([op.factory, op.factoryData ?? '']),
    callData: op.callData,
    accountGasLimits: packUint(op.verificationGasLimit, op.callGasLimit),
    preVerificationGas: BigNumber.from(op.preVerificationGas).toHexString(),
    gasFees: packUint(op.maxPriorityFeePerGas, op.maxFeePerGas),
    paymasterAndData,
    signature: op.signature
  }
}

export function unpackUserOp (packed: PackedUserOperation): UserOperation {
  const [verificationGasLimit, callGasLimit] = unpackUint(packed.accountGasLimits)
  const [maxPriorityFeePerGas, maxFeePerGas] = unpackUint(packed.gasFees)

  let ret: UserOperation = {
    sender: packed.sender,
    nonce: packed.nonce,
    callData: packed.callData,
    preVerificationGas: packed.preVerificationGas,
    verificationGasLimit,
    callGasLimit,
    maxFeePerGas,
    maxPriorityFeePerGas,
    signature: packed.signature
  }
  if (packed.initCode != null && packed.initCode.length > 2) {
    const factory = hexDataSlice(packed.initCode, 0, 20)
    const factoryData = hexDataSlice(packed.initCode, 20)
    ret = {
      ...ret,
      factory,
      factoryData
    }
  }
  const pmData = unpackPaymasterAndData(packed.paymasterAndData)
  if (pmData != null) {
    ret = {
      ...ret,
      paymaster: pmData.paymaster,
      paymasterVerificationGasLimit: pmData.paymasterVerificationGas,
      paymasterPostOpGasLimit: pmData.postOpGasLimit,
      paymasterData: pmData.paymasterData
    }
  }
  return ret
}

/**
 * abi-encode the userOperation
 * @param op a PackedUserOp
 * @param forSignature "true" if the hash is needed to calculate the getUserOpHash()
 *  "false" to pack entire UserOp, for calculating the calldata cost of putting it on-chain.
 */
export function encodeUserOp (op1: PackedUserOperation | UserOperation, forSignature = true): string {
  // if "op" is unpacked UserOperation, then pack it first, before we ABI-encode it.
  let op: PackedUserOperation
  if ('callGasLimit' in op1) {
    op = packUserOp(op1)
  } else {
    op = op1
  }
  if (forSignature) {
    return defaultAbiCoder.encode(
      ['address', 'uint256', 'bytes32', 'bytes32',
        'bytes32', 'uint256', 'bytes32',
        'bytes32'],
      [op.sender, op.nonce, keccak256(op.initCode), keccak256(op.callData),
        op.accountGasLimits, op.preVerificationGas, op.gasFees,
        keccak256(op.paymasterAndData)])
  } else {
    // for the purpose of calculating gas cost encode also signature (and no keccak of bytes)
    return defaultAbiCoder.encode(
      ['address', 'uint256', 'bytes', 'bytes',
        'bytes32', 'uint256', 'bytes32',
        'bytes', 'bytes'],
      [op.sender, op.nonce, op.initCode, op.callData,
        op.accountGasLimits, op.preVerificationGas, op.gasFees,
        op.paymasterAndData, op.signature])
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
export function getUserOpHash (op: UserOperation, entryPoint: string, chainId: number): string {
  const userOpHash = keccak256(encodeUserOp(op, true))
  const enc = defaultAbiCoder.encode(
    ['bytes32', 'address', 'uint256'],
    [userOpHash, entryPoint, chainId])
  return keccak256(enc)
}
