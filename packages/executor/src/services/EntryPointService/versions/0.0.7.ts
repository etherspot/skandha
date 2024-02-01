import { EntryPoint } from "types/lib/contracts/EPv7/core/EntryPoint";
import { EntryPointSimulations } from "types/lib/contracts/EPv7/core/EntryPointSimulations";
import {
  EntryPoint__factory,
  EntryPointSimulations__factory,
} from "types/lib/contracts/EPv7/factories/core";
import { BytesLike, providers } from "ethers";
import RpcError from "types/lib/api/errors/rpc-error";
import * as RpcErrorCodes from "types/lib/api/errors/rpc-error-codes";
import { UserOperation } from "types/lib/contracts/UserOperation";
import { AddressZero, BytesZero } from "params/lib";
import { StakeManager__factory } from "types/src/contracts/EPv7/factories/core";
import { IStakeManager } from "types/lib/contracts/EPv7/interfaces";
import { packUserOp } from "../utils";
import {
  NetworkConfig,
  StakeInfo,
  UserOpValidationResult,
} from "../../../interfaces";
import { getAddr } from "../../../utils";
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
    const errorResult = await this.simulationContract
      .simulateValidation(packUserOp(userOp), {
        gasLimit: this.networkConfig.validationGasLimit,
      })
      .catch((err: any) => this.nonGethErrorHandler(err));
    return this.parseErrorResult(userOp, errorResult);
  }

  getDepositInfo(
    address: string
  ): Promise<IStakeManager.DepositInfoStructOutput> {
    return StakeManager__factory.connect(
      this.address,
      this.provider
    ).getDepositInfo(address);
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

  parseValidationResult(
    userOp: UserOperation,
    data: string
  ): UserOpValidationResult {
    const { name: errorName, args: errorArgs } =
      this.contract.interface.parseError(data);
    const errFullName = `${errorName}(${errorArgs.toString()})`;
    const errResult = this.parseErrorResult(userOp, {
      errorName,
      errorArgs,
    });
    if (!errorName.includes("Result")) {
      throw new Error(errFullName);
    }
    return errResult;
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

  private parseErrorResult(
    userOp: UserOperation,
    errorResult: { errorName: string; errorArgs: any }
  ): UserOpValidationResult {
    if (!errorResult?.errorName?.startsWith("ValidationResult")) {
      // parse it as FailedOp
      // if its FailedOp, then we have the paymaster param... otherwise its an Error(string)
      let paymaster = errorResult.errorArgs?.paymaster;
      if (paymaster === AddressZero) {
        paymaster = undefined;
      }
      // eslint-disable-next-line
      const msg: string =
        errorResult.errorArgs?.reason ?? errorResult.toString();

      if (paymaster == null) {
        throw new RpcError(msg, RpcErrorCodes.VALIDATION_FAILED);
      } else {
        throw new RpcError(msg, RpcErrorCodes.REJECTED_BY_PAYMASTER, {
          paymaster,
        });
      }
    }

    const {
      returnInfo,
      senderInfo,
      factoryInfo,
      paymasterInfo,
      aggregatorInfo, // may be missing (exists only SimulationResultWithAggregator
    } = errorResult.errorArgs;

    // extract address from "data" (first 20 bytes)
    // add it as "addr" member to the "stakeinfo" struct
    // if no address, then return "undefined" instead of struct.
    function fillEntity(
      data: BytesLike,
      info: StakeInfo
    ): StakeInfo | undefined {
      const addr = getAddr(data);
      return addr == null
        ? undefined
        : {
            ...info,
            addr,
          };
    }

    return {
      returnInfo,
      senderInfo: {
        ...senderInfo,
        addr: userOp.sender,
      },
      factoryInfo: fillEntity(userOp.factory!, factoryInfo),
      paymasterInfo: fillEntity(userOp.paymaster!, paymasterInfo),
      aggregatorInfo: fillEntity(
        aggregatorInfo?.actualAggregator,
        aggregatorInfo?.stakeInfo
      ),
    };
  }
}
