/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/strict-boolean-expressions */
import { UserOperation } from "@skandha/types/lib/contracts/UserOperation";
import { IDbController, Logger } from "@skandha/types/lib/index.js";
import {
  UserOperationByHashResponse,
  UserOperationReceipt,
} from "@skandha/types/lib/api/interfaces";
import RpcError from "@skandha/types/lib/api/errors/rpc-error";
import * as RpcErrorCodes from "@skandha/types/lib/api/errors/rpc-error-codes.js";
import { GetContractReturnType, Hex, PublicClient } from "viem";
import { EntryPoint__factory } from "@skandha/types/lib/contracts/EPv8/factories/core";
import {
  DepositInfoStructOutput,
  NetworkConfig,
  StateOverrides,
  UserOpValidationResult,
} from "../../interfaces.js";
import { EntryPointV8Service, IEntryPointService } from "./versions/index.js";
import { EntryPointVersion } from "./interfaces.js";

export class EntryPointService {
  private entryPoints: {
    [address: string]: IEntryPointService;
  } = {};

  constructor(
    private chainId: number,
    private networkConfig: NetworkConfig,
    private publicClient: PublicClient,
    private db: IDbController,
    private logger: Logger
  ) {
    for (const addr of networkConfig.entryPoints) {
      const address = addr.toLowerCase() as Hex;
      this.entryPoints[address] = new EntryPointV8Service(
        addr,
        this.networkConfig,
        this.publicClient,
        this.logger
      );
    }
  }

  /*******************/
  /** View functions */

  async getUserOperationByHash(
    userOpHash: string
  ): Promise<UserOperationByHashResponse | null> {
    if (!userOpHash) {
      throw new RpcError(
        "Missing/invalid userOpHash",
        RpcErrorCodes.INVALID_USEROP
      );
    }
    for (const [_, entryPoint] of Object.entries(this.entryPoints)) {
      try {
        const res = entryPoint.getUserOperationByHash(userOpHash);
        if (res) return res;
      } catch (err) {
        /* empty */
      }
    }
    return null;
  }

  async getUserOperationReceipt(
    userOpHash: string
  ): Promise<UserOperationReceipt | null> {
    if (!userOpHash) {
      throw new RpcError(
        "Missing/invalid userOpHash",
        RpcErrorCodes.INVALID_USEROP
      );
    }
    for (const [_, entryPoint] of Object.entries(this.entryPoints)) {
      try {
        const res = await entryPoint.getUserOperationReceipt(userOpHash);
        if (res) return res;
      } catch (err) {
        /* empty */
      }
    }
    return null;
  }

  async getUserOpHash(entryPoint: Hex, userOp: UserOperation): Promise<Hex> {
    return await this.entryPoints[
      entryPoint.toLowerCase()
    ].getUserOperationHash(userOp);
  }

  async balanceOf(entryPoint: Hex, entity: Hex): Promise<bigint> {
    return await (
      this.entryPoints[entryPoint.toLowerCase()]
        .contract as GetContractReturnType<
        typeof EntryPoint__factory.abi,
        PublicClient
      >
    ).read.balanceOf([entity]);
  }

  async simulateHandleOpUsingSimulatorContracts(
    entryPoint: Hex,
    userOp: UserOperation,
    stateOverrides?: StateOverrides
  ): Promise<any> {
    return await this.entryPoints[
      entryPoint.toLowerCase()
    ].simulateHandleOpUsingSimulatorContracts(userOp, stateOverrides);
  }

  async simulateHandleOp(
    entryPoint: string,
    userOp: UserOperation,
    stateOverrides?: StateOverrides
  ): Promise<any> {
    return await this.entryPoints[entryPoint.toLowerCase()].simulateHandleOp(
      userOp,
      stateOverrides
    );
  }

  async simulateValidation(
    entryPoint: string,
    userOp: UserOperation
  ): Promise<any> {
    return await this.entryPoints[entryPoint.toLowerCase()].simulateValidation(
      userOp
    );
  }

  /********************/
  /** Write functions */

  encodeHandleOps(
    entryPoint: string,
    userOps: UserOperation[],
    beneficiary: string
  ): Hex {
    return this.entryPoints[entryPoint.toLowerCase()].encodeHandleOps(
      userOps,
      beneficiary
    );
  }

  encodeSimulateHandleOp(
    entryPoint: string,
    userOp: UserOperation,
    target: string,
    targetCallData: string
  ): any {
    return this.entryPoints[entryPoint.toLowerCase()].encodeSimulateHandleOp(
      userOp,
      target,
      targetCallData
    );
  }

  encodeSimulateValidation(entryPoint: string, userOp: UserOperation): any {
    return this.entryPoints[entryPoint.toLowerCase()].encodeSimulateValidation(
      userOp
    );
  }

  /**********************/
  /** Utility functions */
  isEntryPointSupported(entryPoint: string): boolean {
    return this.entryPoints[entryPoint.toLowerCase()] != undefined;
  }

  getSupportedEntryPoints(): string[] {
    return Object.keys(this.entryPoints);
  }

  getEntryPointVersion(entryPoint: string): EntryPointVersion {
    if (!this.isEntryPointSupported(entryPoint)) {
      return EntryPointVersion.UNKNOWN;
    }
    return EntryPointVersion.SEVEN;
  }

  getEntryPoint(entryPoint: string): IEntryPointService {
    return this.entryPoints[entryPoint.toLowerCase()];
  }

  calcPreverificationGas(
    entryPoint: string,
    userOp: UserOperation,
    forSignature = true
  ): number {
    return this.entryPoints[entryPoint.toLowerCase()].calcPreverificationGas(
      userOp,
      forSignature
    );
  }

  parseValidationResult(
    entryPoint: string,
    userOp: UserOperation,
    data: string
  ): UserOpValidationResult {
    return this.entryPoints[entryPoint.toLowerCase()].parseValidationResult(
      userOp,
      data
    );
  }

  getFactory(entryPoint: string, userOp: UserOperation): string | undefined {
    return userOp.factory?.toLowerCase();
  }

  getPaymaster(entryPoint: string, userOp: UserOperation): string | undefined {
    return userOp.paymaster?.toLowerCase();
  }

  getDepositInfo(
    entryPoint: string,
    address: string
  ): Promise<DepositInfoStructOutput> {
    return this.entryPoints[entryPoint.toLowerCase()].getDepositInfo(address);
  }
}
