import { ssz, ts } from "types/lib";
import { Bytes32, UintBn256 } from "types/lib/primitive/sszTypes";
import { fromHex, toHex } from "utils/lib";
import { BigNumber, BigNumberish } from "ethers";
import { UserOperationStruct } from "types/lib/executor/contracts/EntryPoint";

const bigintToBigNumber = (bn: bigint): BigNumberish => {
  return BigNumber.from(UintBn256.fromJson(bn) as unknown as string);
};

const bigNumberishToBigint = (bn: BigNumberish): bigint => {
  return UintBn256.fromJson(BigNumber.from(bn).toNumber());
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
    sender: toHex(userOp.sender),
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
export const deserializeUserOpsWithEP = (
  userOpsWithEP: ts.UserOpsWithEntryPoint
) => {
  const du = ssz.UserOpsWithEntryPoint.toViewDU(userOpsWithEP);
  const dEntryPoint = toHex(du.entry_point_contract);
  const dChainId = Number(UintBn256.toJson(du.chain_id));
  const dUserOps = [];
  for (let i = 0; i < du.user_operations.length; ++i) {
    const userOp = du.user_operations.get(i);
    dUserOps.push(deserializeUserOp(userOp));
  }
  return {
    entryPoint: dEntryPoint,
    chainId: dChainId,
    userOps: dUserOps,
  };
};

export const serializeUserOp = (userOp: UserOperationStruct): ts.UserOp => {
  return {
    sender: fromHex(userOp.sender),
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

export const toUserOpsWithEP = (
  entryPoint: string,
  chainId: number,
  userOps: UserOperationStruct[],
  blockHash: string
): ts.UserOpsWithEntryPoint => {
  return {
    entry_point_contract: fromHex(entryPoint),
    chain_id: bigNumberishToBigint(chainId),
    user_operations: userOps.map((userOp) => serializeUserOp(userOp)),
    verified_at_block_hash: bigNumberishToBigint(blockHash),
  };
};
