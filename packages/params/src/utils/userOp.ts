import { ssz, ts } from "@skandha/types/lib";
import { Bytes32, UintBn256 } from "@skandha/types/lib/primitive/sszTypes";
import { fromHex } from "@skandha/utils/lib";
import {
  UserOperation,
  Eip7702Auth,
} from "@skandha/types/lib/contracts/UserOperation";
import { getAddress, toHex } from "viem";

type BigNumberish = bigint | number | `0x${string}` | `${number}` | string;

const bigintToBigNumber = (bn: bigint): BigNumberish => {
  return BigInt(UintBn256.fromJson(bn) as unknown as string);
};

const bigNumberishToBigint = (bn: BigNumberish): bigint => {
  return UintBn256.fromJson(BigInt(bn));
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
    factoryData: userOp.factory_data ? toHex(userOp.factory_data) : undefined,
    callData: toHex(userOp.call_data),
    callGasLimit: bigintToBigNumber(userOp.call_gas_limit),
    verificationGasLimit: bigintToBigNumber(userOp.verification_gas_limit),
    preVerificationGas: bigintToBigNumber(userOp.pre_verification_gas),
    maxFeePerGas: bigintToBigNumber(userOp.max_fee_per_gas),
    maxPriorityFeePerGas: bigintToBigNumber(userOp.max_priority_fee_per_gas),
    paymaster: userOp.paymaster ? getAddress(toHex(userOp.paymaster)) : undefined,
    paymasterVerificationGasLimit: 
      userOp.paymaster_verification_gas_limit
        ? bigintToBigNumber(userOp.paymaster_verification_gas_limit)
        : undefined,
    paymasterPostOpGasLimit:
      userOp.paymaster_post_op_gas_limit
        ? bigintToBigNumber(userOp.paymaster_post_op_gas_limit)
        : undefined,
    paymasterData: userOp.paymaster_data ? toHex(userOp.paymaster_data) : undefined,
    signature: toHex(userOp.signature),
    eip7702Auth: userOp.eip_7702_auth
      ? deserializeEip7702Auth(userOp.eip_7702_auth)
      : undefined,
  };
  return dUserOp;
};

export const deserializeVerifiedUserOperation = (
  verifiedUserOp: ts.VerifiedUserOperation
  // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
) => {
  const du = ssz.VerifiedUserOperation.toViewDU(verifiedUserOp);
  const dEntryPoint = toHex(du.entry_point);
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
    factory_data: userOp.factoryData ? fromHex(userOp.factoryData.toString()): null,
    call_data: fromHex(userOp.callData.toString()),
    call_gas_limit: bigNumberishToBigint(userOp.callGasLimit),
    verification_gas_limit: bigNumberishToBigint(userOp.verificationGasLimit),
    pre_verification_gas: bigNumberishToBigint(userOp.preVerificationGas),
    max_fee_per_gas: bigNumberishToBigint(userOp.maxFeePerGas),
    max_priority_fee_per_gas: bigNumberishToBigint(userOp.maxPriorityFeePerGas),
    paymaster: userOp.paymaster ? fromHex(getAddress(userOp.paymaster)) : null,
    paymaster_verification_gas_limit:
      userOp.paymasterVerificationGasLimit
        ? bigNumberishToBigint(userOp.paymasterVerificationGasLimit)
        : null,
    paymaster_post_op_gas_limit:
      userOp.paymasterPostOpGasLimit
        ? bigNumberishToBigint(userOp.paymasterPostOpGasLimit)
        : null,
    paymaster_data: userOp.paymasterData ? fromHex(userOp.paymasterData.toString()) : null,
    signature: fromHex(userOp.signature.toString()),
    eip_7702_auth:
      userOp.eip7702Auth != undefined
        ? serializeEip7702Auth(userOp.eip7702Auth)
        : null,
  };
};

export const serializeEip7702Auth = (
  eip7702Auth: Eip7702Auth
): ts.Eip7702Auth => {
  return {
    chain_id: bigNumberishToBigint(eip7702Auth.chainId),
    address: fromHex(getAddress(eip7702Auth.address)),
    nonce: bigNumberishToBigint(eip7702Auth.nonce),
    y_parity: bigNumberishToBigint(eip7702Auth.yParity),
    r: bigNumberishToBigint(eip7702Auth.r),
    s: bigNumberishToBigint(eip7702Auth.s),
  };
};

export const deserializeEip7702Auth = (
  eip7702Auth: ts.Eip7702Auth
): Eip7702Auth => {
  return {
    address: getAddress(toHex(eip7702Auth.address)),
    chainId: bigintToBigNumber(eip7702Auth.chain_id),
    nonce: bigintToBigNumber(eip7702Auth.nonce),
    r: toHex(eip7702Auth.r),
    s: toHex(eip7702Auth.s),
    yParity:
      eip7702Auth.y_parity === BigInt(0) || eip7702Auth.y_parity === BigInt(27)
        ? "0x0"
        : "0x1",
  };
};

export const toVerifiedUserOperation = (
  entryPoint: string,
  userOp: UserOperation,
  blockHash: string
): ts.VerifiedUserOperation => {
  return {
    user_operation: serializeUserOp(userOp),
    entry_point: fromHex(getAddress(entryPoint)),
    verified_at_block_hash: bigNumberishToBigint(blockHash),
  };
};
