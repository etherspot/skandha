import {
  ByteListType,
  ContainerType,
  ListCompositeType,
  ByteVectorType,
  OptionalType,
} from "@chainsafe/ssz";
import * as primitiveSsz from "./primitive/sszTypes";
const { Address, Bytes32, UintBn256 } = primitiveSsz;

// constants used in several modules
// =================================

export const MAX_CONTRACT_SIZE = 24576;
export const MAX_BYTE_ARRAY_SIZE = 64000;
export const MAX_OPS_PER_REQUEST = 4096;
export const MAX_MEMPOOLS_PER_BUNDLER = 20;
export const GOSSIP_MAX_SIZE = 1048576;
export const TTFB_TIMEOUT = 5;
export const RESP_TIMEOUT = 10;
export const MAX_SUPPORTED_MEMPOOLS = 1024;

// Mempool
// ========

export const MempoolId = new ByteVectorType(256);
export const ChainId = primitiveSsz.UintBn64;
export const SupportedMempools = new ListCompositeType(
  MempoolId,
  MAX_SUPPORTED_MEMPOOLS
);

// Types used by main gossip topics
// =================================

export const Metadata = new ContainerType(
  {
    seq_number: primitiveSsz.UintBn64,
    supported_mempools: SupportedMempools,
  },
  { typeName: "Metadata", jsonCase: "eth2" }
);

export const Eip7702Auth = new ContainerType(
  {
    chain: primitiveSsz.UintBn256,
    nonce: primitiveSsz.UintBn256,
    address: primitiveSsz.Address,
    r: primitiveSsz.Bytes32,
    s: primitiveSsz.Bytes32,
    v: primitiveSsz.Byte,
  },
  { typeName: "Eip7702Auth", jsonCase: "eth2" }
);

export const UserOp = new ContainerType(
  {
    sender: Address,
    nonce: primitiveSsz.UintBn256,
    factory: new OptionalType(Address),
    factoryData: new OptionalType(new ByteListType(MAX_CONTRACT_SIZE)),
    callData: new ByteListType(MAX_BYTE_ARRAY_SIZE),
    callGasLimit: UintBn256,
    verificationGasLimit: UintBn256,
    preVerificationGas: UintBn256,
    maxFeePerGas: UintBn256,
    maxPriorityFeePerGas: UintBn256,
    paymaster: new OptionalType(Address),
    paymasterVerificationGasLimit: new OptionalType(UintBn256),
    paymasterPostOpGasLimit: new OptionalType(UintBn256),
    paymasterData: new OptionalType(new ByteListType(MAX_BYTE_ARRAY_SIZE)),
    signature: new ByteListType(MAX_CONTRACT_SIZE),
    eip7702Auth: new OptionalType(new ListCompositeType(Eip7702Auth, 1)),
  },
  { typeName: "UserOp", jsonCase: "eth2" }
);

export const VerifiedUserOperation = new ContainerType(
  {
    entry_point_contract: Address,
    verified_at_block_hash: primitiveSsz.UintBn256,
    user_operation: UserOp,
  },
  {
    typeName: "VerifiedUserOperation",
    jsonCase: "eth2",
  }
);

export const PooledUserOps = new ContainerType(
  {
    mempool_id: MempoolId,
    user_operations: new ListCompositeType(UserOp, MAX_OPS_PER_REQUEST),
  },
  {
    typeName: "PooledUserOps",
    jsonCase: "eth2",
  }
);

// ReqResp types
// =============

export const Status = new ContainerType(
  {
    chain_id: primitiveSsz.UintBn64,
    block_hash: Bytes32,
    block_number: primitiveSsz.UintBn64,
  },
  {
    typeName: "Status",
    jsonCase: "eth2",
  }
);

export const Goodbye = primitiveSsz.UintBn64;

export const Ping = primitiveSsz.UintBn64;

export const PooledUserOpHashesRequest = new ContainerType(
  {
    cursor: primitiveSsz.UintBn64,
  },
  {
    typeName: "PooledUserOpHashesRequest",
    jsonCase: "eth2",
  }
);

export const PooledUserOpHashes = new ContainerType(
  {
    next_cursor: primitiveSsz.UintBn64,
    hashes: new ListCompositeType(Bytes32, MAX_OPS_PER_REQUEST),
  },
  {
    typeName: "PooledUserOpHashes",
    jsonCase: "eth2",
  }
);

export const PooledUserOpsByHashRequest = new ContainerType(
  {
    hashes: new ListCompositeType(Bytes32, MAX_OPS_PER_REQUEST),
  },
  {
    typeName: "PooledUserOpsByHashRequest",
    jsonCase: "eth2",
  }
);

export const PooledUserOpsByHash = new ListCompositeType(
  UserOp,
  MAX_OPS_PER_REQUEST
);
