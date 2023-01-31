import { UserOperationStruct } from 'app/@types';
import { AbstractContract } from './Base';
import { BigNumberish, ethers } from 'ethers';
import EntryPointABI from './abi/EntryPoint.json';

export enum EntryPointsContractFunctions {
  HandleOps = 'handleOps',
  SimulateValidation = 'simulateValidation',
  GetSenderAddress = 'getSenderAddress'
}

export enum EntryPointContractEvents {

}

export class EntryPointContract extends
  AbstractContract<
    EntryPointsContractFunctions,
    EntryPointContractEvents
  >
{
  constructor(
    provider: ethers.providers.Provider,
    address: string
  ) {
    super(provider, EntryPointABI, address);
  }

  encodeHandleOps(
    userOps: UserOperationStruct[],
    beneficiary: string
  ) {
    return this.encodeContractFunction(
      EntryPointsContractFunctions.HandleOps,
      userOps,
      beneficiary
    );
  }

  simulateValidation(
    userOp: UserOperationStruct,
    {
      gasLimit
    }: { gasLimit?: BigNumberish } = {}
  ) {
    if (gasLimit) {
      return this.callContractFunctionGasLimited(
        this.address,
        EntryPointsContractFunctions.SimulateValidation,
        gasLimit,
        userOp
      );
    }
    return this.callContractFunction(
      this.address,
      EntryPointsContractFunctions.SimulateValidation,
      userOp
    );
  }

  encodeSimulateValidation(
    userOp: UserOperationStruct,
  ) {
    return this.encodeContractFunction(
      EntryPointsContractFunctions.SimulateValidation,
      userOp
    );
  }
}
