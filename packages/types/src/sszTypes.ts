import {
  BitVectorType,
  ByteListType,
  ContainerType,
  ListCompositeType,
  VectorCompositeType,
  ByteVectorType,
} from "@chainsafe/ssz";
import * as primitiveSsz from "./primitive/sszTypes";
const { Address, Bytes32, UintBn256 } = primitiveSsz;

// constants used in several modules
// =================================

export const MAX_CONTRACT_SIZE = 24576;
export const MAX_BYTE_ARRAY_SIZE = 64000;
export const MEMPOOLS_SUBNET_COUNT = 64;
export const MAX_OPS_PER_REQUEST = 256;
export const MAX_MEMPOOLS_PER_BUNDLER = 20;
export const GOSSIP_MAX_SIZE = 1048576;
export const TTFB_TIMEOUT = 5;
export const RESP_TIMEOUT = 10;

// Types used by main gossip topics
// =================================

export const Metadata = new ContainerType(
  {
    seqNumber: primitiveSsz.UintBn64,
    mempoolSubnets: new BitVectorType(MEMPOOLS_SUBNET_COUNT),
  },
  { typeName: "Metadata", jsonCase: "eth2" }
);

export const UserOp = new ContainerType(
  {
    sender: Address,
    nonce: primitiveSsz.UintBn256,
    initCode: new ByteListType(MAX_CONTRACT_SIZE),
    callData: new ByteListType(MAX_BYTE_ARRAY_SIZE),
    callGasLimit: UintBn256,
    verificationGasLimit: UintBn256,
    preVerificationGas: UintBn256,
    maxFeePerGas: UintBn256,
    maxPriorityFeePerGas: UintBn256,
    paymasterAndData: new ByteListType(MAX_BYTE_ARRAY_SIZE),
    signature: new ByteListType(MAX_CONTRACT_SIZE),
  },
  { typeName: "UserOp", jsonCase: "eth2" }
);

export const UserOpsWithEntryPoint = new ContainerType(
  {
    entry_point_contract: Address,
    verified_at_block_hash: primitiveSsz.UintBn256,
    chain_id: primitiveSsz.UintBn256,
    user_operations: new ListCompositeType(UserOp, MAX_OPS_PER_REQUEST),
  },
  {
    typeName: "UserOpsWithEntryPoint",
    jsonCase: "eth2",
  }
);

export const PooledUserOps = new ContainerType(
  {
    mempool_id: primitiveSsz.Bytes32,
    user_operations: new ListCompositeType(UserOp, MAX_OPS_PER_REQUEST),
  },
  {
    typeName: "PooledUserOps",
    jsonCase: "eth2",
  }
);

// ReqResp types
// =============

export const Status = new VectorCompositeType(
  Bytes32,
  MAX_MEMPOOLS_PER_BUNDLER
);

export const Goodbye = primitiveSsz.UintBn64;

export const Ping = primitiveSsz.UintBn64;

export const PooledUserOpHashesRequest = new ContainerType(
  {
    mempool: Bytes32,
    offset: primitiveSsz.UintBn64,
  },
  {
    typeName: "PooledUserOpHashesRequest",
    jsonCase: "eth2",
  }
);

export const PooledUserOpHashes = new ContainerType(
  {
    more_flag: primitiveSsz.UintBn64,
    hashes: new VectorCompositeType(Bytes32, MAX_OPS_PER_REQUEST),
  },
  {
    typeName: "PooledUserOpHashes",
    jsonCase: "eth2",
  }
);

export const PooledUserOpsByHashRequest = new ContainerType(
  {
    hashes: new VectorCompositeType(Bytes32, MAX_OPS_PER_REQUEST),
  },
  {
    typeName: "PooledUserOpsByHashRequest",
    jsonCase: "eth2",
  }
);

export const PooledUserOpsByHash = new VectorCompositeType(
  Bytes32,
  MAX_OPS_PER_REQUEST
);

// Network
// ========

export const MempoolId = new ByteVectorType(46);
export const MEMPOOL_ID_SUBNET_COUNT = 64;
export const MempoolSubnets = new BitVectorType(MEMPOOL_ID_SUBNET_COUNT);
