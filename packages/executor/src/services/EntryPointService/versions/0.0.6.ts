import {
  UserOperationStruct,
  IEntryPoint,
} from "types/lib/contracts/EPv6/EntryPoint";
import { IEntryPoint__factory } from "types/lib/contracts/EPv6";
import { providers } from "ethers";
import { AddressZero, BytesZero } from "params/lib";
import { NetworkConfig } from "../../../interfaces";
import { IEntryPointService } from "./base";

export class EntryPointV6Service implements IEntryPointService {
  contract: IEntryPoint;

  constructor(
    public address: string,
    private networkConfig: NetworkConfig,
    private provider: providers.JsonRpcProvider
  ) {
    this.contract = IEntryPoint__factory.connect(address, provider);
  }

  async getUserOperationHash(userOp: UserOperationStruct): Promise<string> {
    return await this.contract.getUserOpHash(userOp);
  }

  async simulateHandleOp(userOp: UserOperationStruct): Promise<any> {
    return await this.contract
      .simulateHandleOp(userOp, AddressZero, BytesZero)
      .catch((err) => this.nonGethErrorHandler(err));
  }

  async simulateValidation(userOp: UserOperationStruct): Promise<any> {
    return await this.contract
      .simulateValidation(userOp, {
        gasLimit: this.networkConfig.validationGasLimit,
      })
      .catch((err) => this.nonGethErrorHandler(err));
  }

  encodeHandleOps(userOps: UserOperationStruct[], beneficiary: string): string {
    return this.contract.interface.encodeFunctionData("handleOps", [
      userOps,
      beneficiary,
    ]);
  }

  encodeSimulateHandleOp(
    userOp: UserOperationStruct,
    target: string,
    targetCallData: string
  ): string {
    return this.contract.interface.encodeFunctionData("simulateHandleOp", [
      userOp,
      target,
      targetCallData,
    ]);
  }

  encodeSimulateValidation(userOp: UserOperationStruct): string {
    return this.contract.interface.encodeFunctionData("simulateValidation", [
      userOp,
    ]);
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
