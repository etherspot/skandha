import { BigNumberish, BigNumber, BytesLike, ethers } from "ethers";
import {
  hexZeroPad,
  hexDataLength,
  hexDataSlice,
  hexConcat,
} from "ethers/lib/utils";
import { PackedUserOperationStruct } from "types/lib/contracts/EPv7/core/EntryPoint";
import { UserOperation } from "types/lib/contracts/UserOperation";

export function packAccountGasLimits(
  validationGasLimit: BigNumberish,
  callGasLimit: BigNumberish
): string {
  return hexZeroPad(
    BigNumber.from(validationGasLimit).shl(128).add(callGasLimit).toHexString(),
    32
  );
}

export function unpackAccountGasLimits(accountGasLimits: BytesLike): {
  verificationGasLimit: BigNumber;
  callGasLimit: BigNumber;
} {
  const limits: BigNumber = BigNumber.from(accountGasLimits);
  return {
    verificationGasLimit: limits.shr(128),
    callGasLimit: limits.and(BigNumber.from(1).shl(128).sub(1)),
  };
}

export function packPaymasterData(
  paymaster: string,
  paymasterVerificationGasLimit: BigNumberish,
  postOpGasLimit: BigNumberish,
  paymasterData?: BytesLike
): BytesLike {
  return ethers.utils.hexConcat([
    paymaster,
    packAccountGasLimits(paymasterVerificationGasLimit, postOpGasLimit),
    paymasterData ?? "0x",
  ]);
}

export function unpackPaymasterAndData(paymasterAndData: BytesLike): {
  paymaster: string;
  paymasterVerificationGas: BigNumber;
  postOpGasLimit: BigNumber;
  paymasterData: BytesLike;
} | null {
  if (paymasterAndData.length <= 2) return null;
  if (hexDataLength(paymasterAndData) < 52) {
    // if length is non-zero, then must at least host paymaster address and gas-limits
    throw new Error(`invalid PaymasterAndData: ${paymasterAndData as string}`);
  }
  const {
    verificationGasLimit: paymasterVerificationGas,
    callGasLimit: postOpGasLimit,
  } = unpackAccountGasLimits(hexDataSlice(paymasterAndData, 20, 52));
  return {
    paymaster: hexDataSlice(paymasterAndData, 0, 20),
    paymasterVerificationGas,
    postOpGasLimit,
    paymasterData: hexDataSlice(paymasterAndData, 52),
  };
}

export function packUserOp(op: UserOperation): PackedUserOperationStruct {
  let paymasterAndData: BytesLike;
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
    nonce: BigNumber.from(op.nonce).toHexString(),
    initCode:
      op.factory == null ? "0x" : hexConcat([op.factory, op.factoryData ?? ""]),
    callData: op.callData,
    accountGasLimits: packAccountGasLimits(
      op.verificationGasLimit,
      op.callGasLimit
    ),
    preVerificationGas: BigNumber.from(op.preVerificationGas).toHexString(),
    maxFeePerGas: BigNumber.from(op.maxFeePerGas).toHexString(),
    maxPriorityFeePerGas: BigNumber.from(op.maxPriorityFeePerGas).toHexString(),
    paymasterAndData,
    signature: op.signature,
  };
}

export function unpackUserOp(packed: PackedUserOperationStruct): UserOperation {
  const { callGasLimit, verificationGasLimit } = unpackAccountGasLimits(
    packed.accountGasLimits
  );
  let ret: UserOperation = {
    sender: packed.sender,
    nonce: packed.nonce,
    callData: packed.callData,
    preVerificationGas: packed.preVerificationGas,
    verificationGasLimit,
    callGasLimit,
    maxFeePerGas: packed.maxFeePerGas,
    maxPriorityFeePerGas: packed.maxFeePerGas,
    signature: packed.signature,
  };
  if (packed.initCode != null && packed.initCode.length > 2) {
    const factory = hexDataSlice(packed.initCode, 0, 20);
    const factoryData = hexDataSlice(packed.initCode, 20);
    ret = { ...ret, factory, factoryData };
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
