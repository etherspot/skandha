/* eslint-disable @typescript-eslint/strict-boolean-expressions */
import { BigNumber, providers } from "ethers";
import {
  UserOperation,
  UserOperation6And7,
} from "types/lib/contracts/UserOperation";
import { IDbController, Logger } from "types/lib";
import {
  UserOperationByHashResponse,
  UserOperationReceipt,
} from "types/lib/api/interfaces";
import { IEntryPoint as EntryPointV6Contract } from "types/lib/contracts/EPv6";
import { EntryPoint as EntryPointV7Contract } from "types/lib/contracts/EPv7/core/EntryPoint";
import { NetworkConfig, UserOpValidationResult } from "../../interfaces";
import { getAddr } from "../../utils";
import { ReputationService } from "../ReputationService";
import {
  EntryPointV7Service,
  EntryPointV6Service,
  IEntryPointService,
} from "./versions";
import { EntryPointVersion } from "./interfaces";
import {
  EntryPointV6EventsService,
  EntryPointV7EventsService,
  IEntryPointEventsService,
} from "./eventListeners";

export class EntryPointService {
  private entryPoints: {
    [address: string]: IEntryPointService;
  } = {};
  private eventsService: {
    [address: string]: IEntryPointEventsService;
  } = {};

  constructor(
    private chainId: number,
    private networkConfig: NetworkConfig,
    private provider: providers.JsonRpcProvider,
    private reputationService: ReputationService,
    private db: IDbController,
    private logger: Logger
  ) {
    if (networkConfig.entryPointsV6 && networkConfig.entryPointsV6.length) {
      for (const addr of networkConfig.entryPointsV6) {
        const address = addr.toLowerCase();
        this.entryPoints[address] = new EntryPointV6Service(
          addr,
          this.networkConfig,
          this.provider,
          this.logger
        );
        this.eventsService[address] = new EntryPointV6EventsService(
          addr,
          this.chainId,
          this.entryPoints[address].contract as EntryPointV6Contract,
          this.reputationService,
          this.db
        );
        this.eventsService[address].initEventListener();
      }
    }

    if (networkConfig.entryPointsV7 && networkConfig.entryPointsV7.length) {
      if (!networkConfig.entryPointV7Simulation)
        throw new Error("EntryPointV7Simulation not provided");

      for (const addr of networkConfig.entryPointsV7) {
        const address = addr.toLowerCase();
        this.entryPoints[address] = new EntryPointV7Service(
          addr,
          networkConfig.entryPointV7Simulation,
          this.networkConfig,
          this.provider,
          this.logger
        );
        this.eventsService[address] = new EntryPointV7EventsService(
          addr,
          this.chainId,
          this.entryPoints[address].contract as EntryPointV7Contract,
          this.reputationService,
          this.db
        );
        this.eventsService[address].initEventListener();
      }
    }
  }

  /*******************/
  /** View functions */

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

  /********************/
  /** Write functions */

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
    const epService = this.entryPoints[entryPoint.toLowerCase()];
    if (epService instanceof EntryPointV6Service) {
      return EntryPointVersion.SIX;
    }
    return EntryPointVersion.SEVEN;
  }

  getEntryPoint(entryPoint: string): IEntryPointService {
    return this.entryPoints[entryPoint.toLowerCase()];
  }

  calcPreverificationGas(
    entryPoint: string,
    userOp: UserOperation6And7,
    forSignature = true
  ): number {
    return this.entryPoints[entryPoint.toLowerCase()].calcPreverificationGas(
      userOp,
      forSignature
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

  getFactory(
    entryPoint: string,
    userOp: UserOperation6And7
  ): string | undefined {
    const version = this.getEntryPointVersion(entryPoint);
    if (version === EntryPointVersion.SIX) {
      return getAddr(userOp.initCode)?.toLowerCase();
    }
    if (version === EntryPointVersion.SEVEN) {
      return userOp.factory?.toLowerCase();
    }
    return undefined;
  }

  getPaymaster(
    entryPoint: string,
    userOp: UserOperation6And7
  ): string | undefined {
    const version = this.getEntryPointVersion(entryPoint);
    if (version === EntryPointVersion.SIX) {
      return getAddr(userOp.paymasterAndData)?.toLowerCase();
    }
    if (version === EntryPointVersion.SEVEN) {
      return userOp.paymaster?.toLowerCase();
    }
    return undefined;
  }
}
