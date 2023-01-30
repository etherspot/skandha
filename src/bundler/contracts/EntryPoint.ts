import { UserOperationStruct } from 'app/@types';
import { AbstractContract } from './Base';
import { BigNumberish, ethers } from 'ethers';
import EntryPointABI from './abi/EntryPoint.json';

export enum EntryPointsContractFunctions {
  handleOps = 'handleOps',
  simulateValidation = 'simulateValidation',
  getSenderAddress = 'GetSenderAddress'
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
      EntryPointsContractFunctions.handleOps,
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
        EntryPointsContractFunctions.simulateValidation,
        gasLimit,
        userOp
      );
    }
    return this.callContractFunction(
      this.address,
      EntryPointsContractFunctions.simulateValidation,
      userOp
    );
  }

  encodeSimulateValidation(
    userOp: UserOperationStruct,
  ) {
    return this.encodeContractFunction(
      EntryPointsContractFunctions.simulateValidation,
      userOp
    );
  }
}
