import { UserOperation6And7 } from "types/lib/contracts/UserOperation";
import { ReputationStatus } from "types/lib/executor";

export class EstimateUserOperationGasArgs {
  userOp!: UserOperation6And7;
  entryPoint!: string;
}

export class SendUserOperationGasArgs {
  userOp!: UserOperation6And7;
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
  userOps!: UserOperation6And7[];
  entryPoint!: string;
}
