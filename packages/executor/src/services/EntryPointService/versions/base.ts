import { IEntryPoint as IEntryPointV6 } from "@skandha/types/lib/contracts/EPv6";
import { EntryPoint as IEntryPointV7 } from "@skandha/types/lib/contracts/EPv7/core/EntryPoint";
import { UserOperation } from "@skandha/types/lib/contracts/UserOperation";
import { IStakeManager } from "@skandha/types/lib/contracts/EPv7/core/StakeManager";
import { UserOperationEventEvent } from "@skandha/types/lib/contracts/EPv6/EntryPoint";
import {
  UserOperationByHashResponse,
  UserOperationReceipt,
} from "@skandha/types/lib/api/interfaces";
import { UserOpValidationResult } from "../../../interfaces";

export interface IEntryPointService {
  readonly contract: IEntryPointV6 | IEntryPointV7;
  readonly address: string;

  calcPreverificationGas(
    userOp: Partial<UserOperation>,
    forSignature: boolean
  ): number;

  getUserOperationHash(userOp: UserOperation): Promise<string>;
  getDepositInfo(
    address: string
  ): Promise<IStakeManager.DepositInfoStructOutput>;

  simulateHandleOp(userOp: UserOperation): Promise<any>;
  simulateValidation(userOp: UserOperation): Promise<any>;

  getUserOperationEvent(
    userOpHash: string
  ): Promise<UserOperationEventEvent | null>;
  getUserOperationReceipt(hash: string): Promise<UserOperationReceipt | null>;
  getUserOperationByHash(
    hash: string
  ): Promise<UserOperationByHashResponse | null>;

  encodeHandleOps(userOps: UserOperation[], beneficiary: string): any;
  encodeSimulateHandleOp(
    userOp: UserOperation,
    target: string,
    targetCallData: string
  ): any;
  encodeSimulateValidation(userOp: UserOperation): any;

  parseValidationResult(
    userOp: UserOperation,
    data: string
  ): UserOpValidationResult;
}
