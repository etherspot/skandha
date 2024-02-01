import { IEntryPoint as IEntryPointV6 } from "types/lib/contracts/EPv6";
import { EntryPoint as IEntryPointV7 } from "types/lib/contracts/EPv7/core/EntryPoint";
import { UserOperation6And7 } from "types/lib/contracts/UserOperation";

export interface IEntryPointService {
  readonly contract: IEntryPointV6 | IEntryPointV7;
  readonly address: string;

  getUserOperationHash(userOp: UserOperation6And7): Promise<string>;

  simulateHandleOp(userOp: UserOperation6And7): Promise<any>;
  simulateValidation(userOp: UserOperation6And7): Promise<any>;

  encodeHandleOps(userOps: UserOperation6And7[], beneficiary: string): string;
  encodeSimulateHandleOp(
    userOp: UserOperation6And7,
    target: string,
    targetCallData: string
  ): string;
  encodeSimulateValidation(userOp: UserOperation6And7): string;
}
