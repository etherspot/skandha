import { EntryPoint } from "types/lib/contracts/EPv7/core/EntryPoint";
import { EntryPointSimulations } from "types/lib/contracts/EPv7/core/EntryPointSimulations";
import {
  EntryPoint__factory,
  EntryPointSimulations__factory,
} from "types/lib/contracts/EPv7/factories/core";
import { providers } from "ethers";
import { UserOperation } from "types/lib/contracts/UserOperation";
import { AddressZero, BytesZero } from "params/lib";
import { packUserOp } from "../utils";
import { NetworkConfig } from "../../../interfaces";
import { IEntryPointService } from "./base";

export class EntryPointV7Service implements IEntryPointService {
  contract: EntryPoint;
  simulationContract: EntryPointSimulations;

  constructor(
    public address: string,
    public simulationAddress: string,
    private networkConfig: NetworkConfig,
    private provider: providers.JsonRpcProvider
  ) {
    this.contract = EntryPoint__factory.connect(address, provider);
    this.simulationContract = EntryPointSimulations__factory.connect(
      simulationAddress,
      provider
    );
  }

  async getUserOperationHash(userOp: UserOperation): Promise<string> {
    return await this.contract.getUserOpHash(packUserOp(userOp));
  }

  async simulateHandleOp(userOp: UserOperation): Promise<any> {
    return await this.simulationContract
      .simulateHandleOp(packUserOp(userOp), AddressZero, BytesZero)
      .catch((err) => this.nonGethErrorHandler(err));
  }

  async simulateValidation(userOp: UserOperation): Promise<any> {
    return await this.simulationContract
      .simulateValidation(packUserOp(userOp), {
        gasLimit: this.networkConfig.validationGasLimit,
      })
      .catch((err) => this.nonGethErrorHandler(err));
  }

  encodeHandleOps(userOps: UserOperation[], beneficiary: string): string {
    return this.contract.interface.encodeFunctionData("handleOps", [
      userOps.map(packUserOp),
      beneficiary,
    ]);
  }

  encodeSimulateHandleOp(
    userOp: UserOperation,
    target: string,
    targetCallData: string
  ): string {
    return this.simulationContract.interface.encodeFunctionData(
      "simulateHandleOp",
      [packUserOp(userOp), target, targetCallData]
    );
  }

  encodeSimulateValidation(userOp: UserOperation): string {
    return this.simulationContract.interface.encodeFunctionData(
      "simulateValidation",
      [packUserOp(userOp)]
    );
  }

  private nonGethErrorHandler(errorResult: any): any {
    try {
      let { error } = errorResult;
      if (error && error.error) {
        error = error.error;
      }
      if (error && error.code == -32015 && error.data.startsWith("Reverted ")) {
        /** NETHERMIND */
        const parsed = this.contract.interface.parseError(error.data.slice(9));
        errorResult = {
          ...parsed,
          errorName: parsed.name,
          errorArgs: parsed.args,
        };
      } else if (error && error.code == -32603 && error.data) {
        /** BIFROST */
        const parsed = this.contract.interface.parseError(error.data);
        errorResult = {
          ...parsed,
          errorName: parsed.name,
          errorArgs: parsed.args,
        };
      }
    } catch (err) {
      /* empty */
    }
    return errorResult;
  }
}
