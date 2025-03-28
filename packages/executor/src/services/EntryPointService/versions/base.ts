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
import { GetContractReturnType, Hex, PublicClient } from "viem";
import { EntryPoint__factory } from "@skandha/types/lib/contracts/EPv7/factories/core";


export interface IEntryPointService {
  readonly address: string;
  readonly contract: GetContractReturnType<typeof EntryPoint__factory.abi, PublicClient>;

  calcPreverificationGas(
    userOp: Partial<UserOperation>,
    forSignature: boolean
  ): number;

  getUserOperationHash(userOp: UserOperation): Promise<Hex>;
  getDepositInfo(
    address: string
  ): Promise<{
    deposit: bigint;
    staked: boolean;
    stake: bigint;
    unstakeDelaySec: number;
    withdrawTime: number;
  }>;

  simulateHandleOp(userOp: UserOperation): Promise<any>;
  simulateValidation(userOp: UserOperation): Promise<any>;

  getUserOperationEvent(
    userOpHash: string
  ): Promise<any>;
  getUserOperationReceipt(hash: string): Promise<UserOperationReceipt | null>;
  getUserOperationByHash(
    hash: string
  ): Promise<UserOperationByHashResponse | null>;

  encodeHandleOps(userOps: UserOperation[], beneficiary: string): Hex;
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
