/* eslint-disable @typescript-eslint/strict-boolean-expressions */
import { BigNumber, providers, utils } from "ethers";
import { UserOperation } from "@skandha/types/lib/contracts/UserOperation";
import { IDbController, Logger } from "@skandha/types/lib";
import {
  UserOperationByHashResponse,
  UserOperationReceipt,
} from "@skandha/types/lib/api/interfaces";
import RpcError from "@skandha/types/lib/api/errors/rpc-error";
import * as RpcErrorCodes from "@skandha/types/lib/api/errors/rpc-error-codes";
import { IStakeManager } from "@skandha/types/lib/contracts/EPv8/interfaces";
import { NetworkConfig, UserOpValidationResult } from "../../interfaces";
import { EntryPointV8Service, IEntryPointService } from "./versions";
import { EntryPointVersion } from "./interfaces";

export class EntryPointService {
  private entryPoints: {
    [address: string]: IEntryPointService;
  } = {};

  constructor(
    private chainId: number,
    private networkConfig: NetworkConfig,
    private provider: providers.JsonRpcProvider,
    private db: IDbController,
    private logger: Logger
  ) {
    for (const addr of networkConfig.entryPoints) {
      const address = addr.toLowerCase();
      this.entryPoints[address] = new EntryPointV8Service(
        addr,
        this.networkConfig,
        this.provider,
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
        const res = entryPoint.getUserOperationReceipt(userOpHash);
        if (res) return res;
      } catch (err) {
        /* empty */
      }
    }
    return null;
  }

  async getUserOpHash(
    entryPoint: string,
    userOp: UserOperation
  ): Promise<string> {
    return await this.entryPoints[
      entryPoint.toLowerCase()
    ].getUserOperationHash(userOp);
  }

  async balanceOf(entryPoint: string, entity: string): Promise<BigNumber> {
    return await this.entryPoints[entryPoint.toLowerCase()].contract.balanceOf(
      entity
    );
  }

  async simulateHandleOp(
    entryPoint: string,
    userOp: UserOperation
  ): Promise<any> {
    return await this.entryPoints[entryPoint.toLowerCase()].simulateHandleOp(
      userOp
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
  ): string {
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
    return Object.keys(this.entryPoints).map((entryPoint) =>
      utils.getAddress(entryPoint)
    );
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
  ): Promise<IStakeManager.DepositInfoStructOutput> {
    return this.entryPoints[entryPoint.toLowerCase()].getDepositInfo(address);
  }
}
