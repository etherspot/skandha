import { ssz, ts } from "@skandha/types/lib";
import { Bytes32, UintBn256 } from "@skandha/types/lib/primitive/sszTypes";
import { fromHex } from "@skandha/utils/lib";
import {
  UserOperation,
  Eip7702Auth,
} from "@skandha/types/lib/contracts/UserOperation";
import { concat, getAddress, Hex, hexToBytes, pad, size, slice, toHex } from "viem";

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

export function unpackUint(
  packed: Hex
): [high128: bigint, low128: bigint] {
  const arr = hexToBytes(packed);
  return [
    BigInt(toHex(arr.slice(0, 16))),
    BigInt(toHex(arr.slice(16, 32)))
  ]
}

export function packUint(high128: BigNumberish, low128: BigNumberish): Hex {
  const high = BigInt(high128);
  const low = BigInt(low128);

  const packed = (high << BigInt(128)) + low;

  return pad(toHex(packed), {size: 32});
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

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export const deserializeUserOp = (userOp: ts.UserOp) => {

  const initCode = toHex(userOp.init_code);
  const parsedPaymasterAndData = unpackPaymasterAndData(toHex(userOp.paymaster_and_data));

  const dUserOp: UserOperation = {
    sender: getAddress(toHex(userOp.sender)),
    nonce: bigintToBigNumber(userOp.nonce),
    factory: initCode.length > 2 ? getAddress(slice(initCode, 0, 20)) : undefined,
    factoryData: initCode.length > 2 ? slice(initCode, 20) : undefined,
    callData: toHex(userOp.call_data),
    callGasLimit: bigintToBigNumber(userOp.call_gas_limit),
    verificationGasLimit: bigintToBigNumber(userOp.verification_gas_limit),
    preVerificationGas: bigintToBigNumber(userOp.pre_verification_gas),
    maxFeePerGas: bigintToBigNumber(userOp.max_fee_per_gas),
    maxPriorityFeePerGas: bigintToBigNumber(userOp.max_priority_fee_per_gas),
    paymaster: parsedPaymasterAndData ? getAddress(parsedPaymasterAndData.paymaster) : undefined,
    paymasterVerificationGasLimit: parsedPaymasterAndData?.paymasterVerificationGas,
    paymasterPostOpGasLimit: parsedPaymasterAndData?.postOpGasLimit,
    paymasterData: parsedPaymasterAndData?.paymasterData,
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
    init_code: fromHex(concat([userOp.factory ?? "0x", userOp.factoryData ?? "0x"])),
    call_data: fromHex(userOp.callData.toString()),
    call_gas_limit: bigNumberishToBigint(userOp.callGasLimit),
    verification_gas_limit: bigNumberishToBigint(userOp.verificationGasLimit),
    pre_verification_gas: bigNumberishToBigint(userOp.preVerificationGas),
    max_fee_per_gas: bigNumberishToBigint(userOp.maxFeePerGas),
    max_priority_fee_per_gas: bigNumberishToBigint(userOp.maxPriorityFeePerGas),
    paymaster_and_data:
      (userOp.paymaster && userOp.paymasterVerificationGasLimit && userOp.paymasterPostOpGasLimit) ?
        fromHex(
          packPaymasterData(
            userOp.paymaster,
            userOp.paymasterVerificationGasLimit,
            userOp.paymasterPostOpGasLimit,
            userOp.paymasterData
          )
        ) :
        fromHex("0x"),
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
