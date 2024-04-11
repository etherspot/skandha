import { BigNumberish, BytesLike } from "ethers";
import { ReputationStatus } from "types/lib/executor";

export class EstimateUserOperationStruct {
  sender!: string;
  nonce!: BigNumberish;
  initCode!: BytesLike;
  callData!: BytesLike;
  signature!: BytesLike;

  verificationGasLimit?: BigNumberish;
  preVerificationGas?: BigNumberish;
  maxFeePerGas?: BigNumberish;
  maxPriorityFeePerGas?: BigNumberish;
  paymasterAndData?: BytesLike;
  callGasLimit?: BigNumberish;
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

export class SetReputationArgs {
  reputations!: {
    address: string;
    opsSeen: number;
    opsIncluded: number;
    status?: ReputationStatus;
  }[];

  entryPoint!: string;
}

export class SetMempoolArgs {
  userOps!: SendUserOperationStruct[];
  entryPoint!: string;
}
