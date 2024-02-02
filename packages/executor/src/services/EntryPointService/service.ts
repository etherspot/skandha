/* eslint-disable @typescript-eslint/strict-boolean-expressions */
import { BigNumber, providers } from "ethers";
import {
  UserOperation,
  UserOperation6And7,
} from "types/lib/contracts/UserOperation";
import { Logger } from "types/lib";
import {
  UserOperationByHashResponse,
  UserOperationReceipt,
} from "types/lib/api/interfaces";
import { Config } from "../../config";
import { NetworkConfig, UserOpValidationResult } from "../../interfaces";
import {
  EntryPointV7Service,
  EntryPointV6Service,
  IEntryPointService,
} from "./versions";
import { EntryPointVersion } from "./interfaces";

export class EntryPointService {
  private entryPoints: {
    [address: string]: IEntryPointService;
  } = {};

  constructor(
    private config: Config,
    private networkConfig: NetworkConfig,
    private provider: providers.JsonRpcProvider,
    private logger: Logger
  ) {
    if (networkConfig.entryPointsV6) {
      for (const addr of networkConfig.entryPointsV6) {
        this.entryPoints[addr.toLowerCase()] = new EntryPointV6Service(
          addr,
          this.networkConfig,
          this.provider,
          this.logger
        );
      }
    }

    if (networkConfig.entryPointsV7) {
      if (!networkConfig.entryPointV7Simulation)
        throw new Error("EntryPointV7Simulation not provided");

      for (const addr of networkConfig.entryPointsV7) {
        this.entryPoints[addr.toLowerCase()] = new EntryPointV7Service(
          addr,
          networkConfig.entryPointV7Simulation,
          this.networkConfig,
          this.provider,
          this.logger
        );
      }
    }
  }

  async getUserOperationByHash(
    userOpHash: string
  ): Promise<UserOperationByHashResponse | null> {
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

  calcPreverificationGas(
    entryPoint: string,
    userOp: UserOperation6And7,
    forSignature = true
  ): number {
    return this.entryPoints[entryPoint].calcPreverificationGas(
      userOp,
      forSignature
    );
  }

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
    const epService = this.entryPoints[entryPoint];
    if (epService instanceof EntryPointV6Service) {
      return EntryPointVersion.SIX;
    }
    return EntryPointVersion.SEVEN;
  }

  getEntryPoint(entryPoint: string): IEntryPointService {
    return this.entryPoints[entryPoint];
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
    userOp: UserOperation6And7
  ): Promise<any> {
    return await this.entryPoints[entryPoint.toLowerCase()].simulateHandleOp(
      userOp
    );
  }

  async simulateValidation(
    entryPoint: string,
    userOp: UserOperation6And7
  ): Promise<any> {
    return await this.entryPoints[entryPoint.toLowerCase()].simulateValidation(
      userOp
    );
  }

  encodeHandleOps(
    entryPoint: string,
    userOps: UserOperation6And7[],
    beneficiary: string
  ): string {
    return this.entryPoints[entryPoint.toLowerCase()].encodeHandleOps(
      userOps,
      beneficiary
    );
  }

  encodeSimulateHandleOp(
    entryPoint: string,
    userOp: UserOperation6And7,
    target: string,
    targetCallData: string
  ): string {
    return this.entryPoints[entryPoint.toLowerCase()].encodeSimulateHandleOp(
      userOp,
      target,
      targetCallData
    );
  }

  encodeSimulateValidation(
    entryPoint: string,
    userOp: UserOperation6And7
  ): string {
    return this.entryPoints[entryPoint.toLowerCase()].encodeSimulateValidation(
      userOp
    );
  }

  parseValidationResult(
    entryPoint: string,
    userOp: UserOperation6And7,
    data: string
  ): UserOpValidationResult {
    return this.entryPoints[entryPoint.toLowerCase()].parseValidationResult(
      userOp,
      data
    );
  }
}
