import { keccak256, toBytes } from "viem";

export const DefaultGasOverheads = {
  fixed: 21000,
  perUserOp: 18300,
  perUserOpWord: 4,
  zeroByte: 4,
  nonZeroByte: 16,
  bundleSize: 1,
  sigSize: 65,
};

export const IMPLEMENTATION_ADDRESS_MARKER =
  "0xA13dB4eCfbce0586E57D1AeE224FbE64706E8cd3";

export const USER_OP_REVERTED_TOPIC_HASH = keccak256(
  toBytes('UserOperationRevertReason(bytes32,address,uint256,bytes)')
);
