import { BigNumberish, BytesLike } from "ethers";

export class EstimateUserOperationStruct {
  sender!: string;
  nonce!: BigNumberish;
  initCode!: BytesLike;
  callData!: BytesLike;
  verificationGasLimit?: BigNumberish;
  preVerificationGas?: BigNumberish;
  maxFeePerGas?: BigNumberish;
  maxPriorityFeePerGas?: BigNumberish;
  paymasterAndData?: BytesLike;
  signature!: BytesLike;
  callGasLimit!: BigNumberish;
}

export class EstimateUserOperationGasArgs {
  userOp!: EstimateUserOperationStruct;
  entryPoint!: string;
}

export class SendUserOperationStruct {
  sender!: string;
  nonce!: BigNumberish;
  initCode!: BytesLike;
  callData!: BytesLike;
  verificationGasLimit!: BigNumberish;
  preVerificationGas!: BigNumberish;
  maxFeePerGas!: BigNumberish;
  maxPriorityFeePerGas!: BigNumberish;
  paymasterAndData!: BytesLike;
  signature!: BytesLike;
  callGasLimit!: BigNumberish;
}

export class SendUserOperationGasArgs {
  userOp!: SendUserOperationStruct;
  entryPoint!: string;
}
