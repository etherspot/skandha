import { UserOperationStruct } from 'app/@types';
import { AbstractContract } from './Base';
import { ethers } from 'ethers';
import EntryPointABI from './abi/EntryPoint.json';

export enum EntryPointsContractFunctions {
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

  simulateValidation(
    userOp: UserOperationStruct
  ) {
    return this.callContractFunction(
      this.address,
      EntryPointsContractFunctions.simulateValidation,
      userOp
    );
  }
}
