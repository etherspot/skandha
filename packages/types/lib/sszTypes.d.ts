import { BitVectorType, ByteListType, ContainerType, VectorCompositeType } from "@chainsafe/ssz";
export declare const MAX_CONTRACT_SIZE = 24576;
export declare const MAX_BYTE_ARRAY_SIZE = 64000;
export declare const MEMPOOLS_SUBNET_COUNT = 64;
export declare const MAX_OPS_PER_REQUEST = 256;
export declare const MAX_MEMPOOLS_PER_BUNDLER = 20;
export declare const GOSSIP_MAX_SIZE = 1048576;
export declare const TTFB_TIMEOUT = 5;
export declare const RESP_TIMEOUT = 10;
export declare const Metadata: ContainerType<{
    seqNumber: import("@chainsafe/ssz").UintBigintType;
    mempoolnets: BitVectorType;
}>;
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
export declare const Status: ContainerType<{
    supportedMempools: VectorCompositeType<import("@chainsafe/ssz").ByteVectorType>;
}>;
export declare const Goodbye: import("@chainsafe/ssz").UintBigintType;
export declare const Ping: import("@chainsafe/ssz").UintBigintType;
//# sourceMappingURL=sszTypes.d.ts.map