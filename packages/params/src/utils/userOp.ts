import { ssz, ts } from "types/lib";
import { Bytes32, UintBn256 } from "types/lib/primitive/sszTypes";
import { fromHex, toHex } from "utils/lib";
import { BigNumber, BigNumberish } from "ethers";
import { UserOperationStruct } from "types/lib/executor/contracts/EntryPoint";
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
    initCode: toHex(userOp.init_code),
    callData: toHex(userOp.call_data),
    callGasLimit: bigintToBigNumber(userOp.call_gas_limit),
    verificationGasLimit: bigintToBigNumber(userOp.verification_gas_limit),
    preVerificationGas: bigintToBigNumber(userOp.pre_verification_gas),
    maxFeePerGas: bigintToBigNumber(userOp.max_fee_per_gas),
    maxPriorityFeePerGas: bigintToBigNumber(userOp.max_priority_fee_per_gas),
    paymasterAndData: toHex(userOp.paymaster_and_data),
    signature: toHex(userOp.signature),
  };
  return dUserOp;
};

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export const deserializeVerifiedUserOperation = (
  verifiedUserOp: ts.VerifiedUserOperation
) => {
  const du = ssz.VerifiedUserOperation.toViewDU(verifiedUserOp);
  const dEntryPoint = toHex(du.entry_point);
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
    init_code: fromHex(userOp.initCode.toString()),
    call_data: fromHex(userOp.callData.toString()),
    call_gas_limit: bigNumberishToBigint(userOp.callGasLimit),
    verification_gas_limit: bigNumberishToBigint(userOp.verificationGasLimit),
    pre_verification_gas: bigNumberishToBigint(userOp.preVerificationGas),
    max_fee_per_gas: bigNumberishToBigint(userOp.maxFeePerGas),
    max_priority_fee_per_gas: bigNumberishToBigint(userOp.maxPriorityFeePerGas),
    paymaster_and_data: fromHex(userOp.paymasterAndData.toString()),
    signature: fromHex(userOp.signature.toString()),
  };
};

export const toVerifiedUserOperation = (
  entryPoint: string,
  userOp: UserOperationStruct,
  blockHash: string
): ts.VerifiedUserOperation => {
  return {
    entry_point: fromHex(getAddress(entryPoint)),
    user_operation: serializeUserOp(userOp),
    verified_at_block_hash: bigNumberishToBigint(blockHash),
  };
};
