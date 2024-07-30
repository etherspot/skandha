import { ssz, ts } from "@skandha/types/lib";
import { Bytes32, UintBn256 } from "@skandha/types/lib/primitive/sszTypes";
import { fromHex, toHex } from "@skandha/utils/lib";
import { BigNumber, BigNumberish } from "ethers";
import { UserOperation } from "@skandha/types/lib/contracts/UserOperation";
import { getAddress } from "ethers/lib/utils";

const bigintToBigNumber = (bn: bigint): BigNumberish => {
  return BigNumber.from(UintBn256.fromJson(bn) as unknown as string);
};

const bigNumberishToBigint = (bn: BigNumberish): bigint => {
  return UintBn256.fromJson(BigNumber.from(bn).toBigInt());
};

export const userOpHashToBytes = (hash: string): ts.Bytes32 => {
  return Bytes32.fromJson(hash);
};

export const userOpHashToString = (hash: ts.Bytes32): string => {
  return Bytes32.toJson(hash) as string;
};

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export const deserializeUserOp = (userOp: ts.UserOp) => {
  const dUserOp: UserOperation = {
    sender: getAddress(toHex(userOp.sender)),
    nonce: bigintToBigNumber(userOp.nonce),
    factory: userOp.factory ? getAddress(toHex(userOp.factory)) : undefined,
    factoryData: userOp.factoryData ? toHex(userOp.factoryData) : undefined,
    callData: toHex(userOp.callData),
    callGasLimit: bigintToBigNumber(userOp.callGasLimit),
    verificationGasLimit: bigintToBigNumber(userOp.verificationGasLimit),
    preVerificationGas: bigintToBigNumber(userOp.preVerificationGas),
    maxFeePerGas: bigintToBigNumber(userOp.maxFeePerGas),
    maxPriorityFeePerGas: bigintToBigNumber(userOp.maxPriorityFeePerGas),
    paymaster: userOp.paymaster
      ? getAddress(toHex(userOp.paymaster))
      : undefined,
    paymasterVerificationGasLimit: userOp.paymasterVerificationGasLimit
      ? bigintToBigNumber(userOp.paymasterVerificationGasLimit)
      : undefined,
    paymasterPostOpGasLimit: userOp.paymasterPostOpGasLimit
      ? bigintToBigNumber(userOp.paymasterPostOpGasLimit)
      : undefined,
    paymasterData: userOp.paymasterData
      ? toHex(userOp.paymasterData)
      : undefined,
    signature: toHex(userOp.signature),
  };
  return dUserOp;
};

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export const deserializeVerifiedUserOperation = (
  verifiedUserOp: ts.VerifiedUserOperation
) => {
  const du = ssz.VerifiedUserOperation.toViewDU(verifiedUserOp);
  const dEntryPoint = toHex(du.entry_point_contract);
  const dUserOp = deserializeUserOp(du.user_operation);
  return {
    entryPoint: dEntryPoint,
    userOp: dUserOp,
  };
};

export const serializeUserOp = (userOp: UserOperation): ts.UserOp => {
  return {
    sender: fromHex(getAddress(userOp.sender)),
    nonce: bigNumberishToBigint(userOp.nonce),
    factory: userOp.factory ? fromHex(getAddress(userOp.factory)) : null,
    factoryData:
      userOp.factoryData != undefined
        ? fromHex(userOp.factoryData.toString())
        : null,
    callData: fromHex(userOp.callData.toString()),
    callGasLimit: bigNumberishToBigint(userOp.callGasLimit),
    verificationGasLimit: bigNumberishToBigint(userOp.verificationGasLimit),
    preVerificationGas: bigNumberishToBigint(userOp.preVerificationGas),
    maxFeePerGas: bigNumberishToBigint(userOp.maxFeePerGas),
    maxPriorityFeePerGas: bigNumberishToBigint(userOp.maxPriorityFeePerGas),
    paymaster: userOp.paymaster ? fromHex(getAddress(userOp.paymaster)) : null,
    paymasterVerificationGasLimit:
      userOp.paymasterVerificationGasLimit != undefined
        ? bigNumberishToBigint(userOp.paymasterVerificationGasLimit)
        : null,
    paymasterPostOpGasLimit:
      userOp.paymasterPostOpGasLimit != undefined
        ? bigNumberishToBigint(userOp.paymasterPostOpGasLimit)
        : null,
    paymasterData:
      userOp.paymasterData != undefined
        ? fromHex(userOp.paymasterData.toString())
        : null,
    signature: fromHex(userOp.signature.toString()),
  };
};

export const toVerifiedUserOperation = (
  entryPoint: string,
  userOp: UserOperation,
  blockHash: string
): ts.VerifiedUserOperation => {
  return {
    entry_point_contract: fromHex(getAddress(entryPoint)),
    user_operation: serializeUserOp(userOp),
    verified_at_block_hash: bigNumberishToBigint(blockHash),
  };
};
