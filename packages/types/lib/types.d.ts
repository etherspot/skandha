import { ByteListType, ContainerType } from "@chainsafe/ssz";
export * from "./primitive/types";
export declare const MAX_CONTRACT_SIZE: number;
export declare const UserOp: ContainerType<{
    sender: import("@chainsafe/ssz").ByteVectorType;
    nonce: import("@chainsafe/ssz").UintBigintType;
    initCode: ByteListType;
    callData: ByteListType;
    callGasLimit: import("@chainsafe/ssz").UintBigintType;
    verificationGasLimit: import("@chainsafe/ssz").UintBigintType;
    preVerificationGasLimit: import("@chainsafe/ssz").UintBigintType;
    maxFeePerGas: import("@chainsafe/ssz").UintBigintType;
    paymasterAndData: ByteListType;
    signature: import("@chainsafe/ssz").ByteVectorType;
}>;
//# sourceMappingURL=types.d.ts.map