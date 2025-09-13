/* eslint-disable @typescript-eslint/no-explicit-any */
import { UserOperation } from "@skandha/types/lib/contracts/UserOperation";
import {
  UserOperationByHashResponse,
  UserOperationReceipt,
} from "@skandha/types/lib/api/interfaces";
import { GetContractReturnType, Hex } from "viem";
import { StateOverrides, UserOpValidationResult } from "../../../interfaces.js";

export interface IEntryPointService {
  readonly address: string;
  readonly contract: GetContractReturnType;

  calcPreverificationGas(
    userOp: Partial<UserOperation>,
    forSignature: boolean
  ): number;

  getUserOperationHash(userOp: UserOperation): Promise<Hex>;
  getDepositInfo(address: string): Promise<{
    deposit: bigint;
    staked: boolean;
    stake: bigint;
    unstakeDelaySec: number;
    withdrawTime: number;
  }>;

  simulateHandleOp(
    userOp: UserOperation,
    stateOverrides?: StateOverrides
  ): Promise<any>;
  simulateHandleOpUsingSimulatorContracts(
    userOp: UserOperation,
    stateOverrides?: StateOverrides
  ): Promise<any>;
  simulateValidation(userOp: UserOperation): Promise<any>;

  getUserOperationEvent(userOpHash: string): Promise<any>;
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
