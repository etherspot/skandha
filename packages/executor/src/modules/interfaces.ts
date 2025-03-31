import { UserOperation } from "@skandha/types/lib/contracts/UserOperation";
import { ReputationStatus } from "@skandha/types/lib/executor";
import {Hex} from "viem"

export class EstimateUserOperationGasArgs {
  userOp!: Omit<
    UserOperation,
    | "callGasLimit"
    | "verificationGasLimit"
    | "preVerificationGas"
    | "maxFeePerGas"
    | "maxPriorityFeePerGas"
  >;
  entryPoint!: Hex;
}

export class SendUserOperationGasArgs {
  userOp!: UserOperation;
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
  userOps!: UserOperation[];
  entryPoint!: string;
}
