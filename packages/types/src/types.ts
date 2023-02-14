import {
  ByteListType,
  ContainerType,
} from "@chainsafe/ssz";

import * as primitiveSsz from "./primitive/sszTypes";

const {
  Address,
  Bytes96,
  UintBn256
} = primitiveSsz;

export * from "./primitive/types";
// Misc Types
// ================

export const MAX_CONTRACT_SIZE: number = 24576;

export const UserOp = new ContainerType ({
  sender: Address,
  nonce: primitiveSsz.UintBn256,
  initCode: new ByteListType(MAX_CONTRACT_SIZE),
  callData: new ByteListType(MAX_CONTRACT_SIZE),
  callGasLimit: UintBn256,
  verificationGasLimit: UintBn256,
  preVerificationGasLimit: UintBn256,
  maxFeePerGas: UintBn256,
  paymasterAndData: new ByteListType(MAX_CONTRACT_SIZE),
  signature: Bytes96,
});

