import { ssz, ts } from "@skandha/types/lib";
import { Bytes32, UintBn256 } from "@skandha/types/lib/primitive/sszTypes";
import { fromHex, toHex } from "@skandha/utils/lib";
import { BigNumber, BigNumberish } from "ethers";
import { UserOperationStruct } from "@skandha/types/lib/contracts/EPv6/EntryPoint";
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
  const dUserOp = {
    sender: getAddress(toHex(userOp.sender)),
    nonce: bigintToBigNumber(userOp.nonce),
    initCode: toHex(userOp.initCode),
    callData: toHex(userOp.callData),
    callGasLimit: bigintToBigNumber(userOp.callGasLimit),
    verificationGasLimit: bigintToBigNumber(userOp.verificationGasLimit),
    preVerificationGas: bigintToBigNumber(userOp.preVerificationGas),
    maxFeePerGas: bigintToBigNumber(userOp.maxFeePerGas),
    maxPriorityFeePerGas: bigintToBigNumber(userOp.maxPriorityFeePerGas),
    paymasterAndData: toHex(userOp.paymasterAndData),
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

export const serializeUserOp = (userOp: UserOperationStruct): ts.UserOp => {
  return {
    sender: fromHex(getAddress(userOp.sender)),
    nonce: bigNumberishToBigint(userOp.nonce),
    initCode: fromHex(userOp.initCode.toString()),
    callData: fromHex(userOp.callData.toString()),
    callGasLimit: bigNumberishToBigint(userOp.callGasLimit),
    verificationGasLimit: bigNumberishToBigint(userOp.verificationGasLimit),
    preVerificationGas: bigNumberishToBigint(userOp.preVerificationGas),
    maxFeePerGas: bigNumberishToBigint(userOp.maxFeePerGas),
    maxPriorityFeePerGas: bigNumberishToBigint(userOp.maxPriorityFeePerGas),
    paymasterAndData: fromHex(userOp.paymasterAndData.toString()),
    signature: fromHex(userOp.signature.toString()),
  };
};

export const toVerifiedUserOperation = (
  entryPoint: string,
  userOp: UserOperationStruct,
  blockHash: string
): ts.VerifiedUserOperation => {
  return {
    entry_point_contract: fromHex(getAddress(entryPoint)),
    user_operation: serializeUserOp(userOp),
    verified_at_block_hash: bigNumberishToBigint(blockHash),
  };
};
