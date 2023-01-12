import { providers, utils } from 'ethers';
import ContractInterface = utils.Interface;

export interface ContractLog<A = any, E = string> {
  eventName: E;
  eventArgs: A;
  blockNumber: number;
  transactionHash: string;
  transactionIndex: number;
  logIndex: number;
}

export interface DecodedFunctionData<F = any, T = any> {
  name: F;
  inputs: T;
}

export abstract class AbstractContract<F = string, E = string> {
  protected contractInterface: ContractInterface;
  
  protected provider: providers.Provider;

  constructor(
    provider: providers.Provider,
    contractAbi: any,
    public address: string,
  ) {
    this.contractInterface = new ContractInterface(contractAbi);
    this.provider = provider;
  }

  async getLogs(filter: providers.Filter): Promise<ContractLog<any, E>[]> {
    const logs = await this.provider.getLogs({
      address: this.address,
      ...filter
    });

    return this.decodeLogs(logs);
  }

  decodeLogs(logs: providers.Log[]): ContractLog<any, E>[] {
    return logs
      .map(log => {
        let result: ContractLog<any, any> | null;

        try {
          const { args, name: eventName } = this.contractInterface.parseLog(log);

          const eventArgs = Object.entries(args).reduce((res, [key, value]) => {
            return key !== '0' && key !== 'length' && !parseInt(key)
              ? {
                  ...res,
                  [key]: value
                }
              : res;
          }, {});

          const { blockNumber, transactionIndex, transactionHash, logIndex } = log;

          result = {
            eventName,
            eventArgs,
            blockNumber,
            transactionIndex,
            transactionHash,
            logIndex
          };
        } catch (err) {
          result = null;
        }

        return result as ContractLog<any, any>;
      })
      .filter(log => !!log);
  }

  decodeFunctionData<T = any>(data: string): DecodedFunctionData<F, T> | null {
    let inputs: T | null;
    let name: F | null = null;

    try {
      const func = this.contractInterface.getFunction(data.slice(0, 10));
      name = func.name as any;

      inputs = this.contractInterface.decodeFunctionData(data.slice(0, 10), data) as any;
    } catch (err) {
      inputs = null;
    }

    return inputs
      ? {
          name: name as F,
          inputs
        }
      : null;
  }

  protected async callContractFunction(
    to: string,
    name: F,
    ...args: any[]
  ): Promise<utils.Result> {
    let result: utils.Result | null = null;

    const data = this.contractInterface.encodeFunctionData(name as any, args);

    const response = await this.provider.call({
      to,
      data
    });

    if (response !== '0x') {
      result = this.contractInterface.decodeFunctionResult(name as any, response);
    }

    return result as utils.Result;
  }

  protected async callContractFunctionWithSingleResult<T = any>(
    to: string,
    name: F,
    ...args: any[]
  ): Promise<T> {
    const result = await this.callContractFunction(to, name, ...args);

    return result && typeof result[0] !== 'undefined' ? result[0] : null;
  }

  protected async selfCallContractFunction(
    name: F,
    ...args: any[]
  ): Promise<utils.Result> {
    return this.callContractFunction(this.address, name, ...args);
  }

  protected async selfCallContractFunctionWithSingleResult<T = any>(
    name: F,
    ...args: any[]
  ): Promise<T> {
    return this.callContractFunctionWithSingleResult(
      this.address,
      name,
      ...args,
    );
  }

  protected encodeContractFunction(name: F, ...args: any[]): string {
    return this.contractInterface.encodeFunctionData(name as any, args);
  }
}
