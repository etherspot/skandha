import { NETWORK_NAME_TO_CHAIN_ID, NetworkNames, Sdk } from 'etherspot';
import { NextFunction, Request, Response } from 'express';
import {
  EthChainIdResponse,
  SupportedEntryPoints,
  BundlingMode
} from 'app/@types';
import { RelayerConfigOptions } from 'app/config';
import RpcError from '../errors/rpc-error';
import { deepHexlify } from './utils';
import { BundlerRPCMethods } from './constants';
import { EntryPointContract } from './contracts/EntryPoint';
import { ethers, providers } from 'ethers';

export interface RpcHandlerOptions {
  network: NetworkNames
  relayer: RelayerConfigOptions
}

export class RpcHandler {
  private bundlingMode: BundlingMode;

  private network: NetworkNames;

  private relayer: RelayerConfigOptions;

  private entryPoint: EntryPointContract;

  private provider: providers.Provider;

  constructor(options: RpcHandlerOptions) {
    this.network = options.network;
    this.relayer = options.relayer;
    this.bundlingMode = 'auto';

    if (!this.relayer.entryPoint) {
      throw new Error(`Invalid ${this.network} relayer config`);
    }

    this.provider = new ethers.providers.JsonRpcProvider(this.relayer.rpcEndpoint);
    this.entryPoint = new EntryPointContract(this.provider, this.relayer.entryPoint);
  }
  
  public async methodHandler(req: Request, res: Response, next: NextFunction) {
    let result: any;
    const {
      method,
      params,
      jsonrpc,
      id
    } = req.body;
    try {
      switch (method) {
        case BundlerRPCMethods.eth_supportedEntryPoints:
          result = await this.getSupportedEntryPoints();
          break;
        case BundlerRPCMethods.eth_chainId:
          result = await this.getChainId();
          break;
        case BundlerRPCMethods.web3_clientVersion:
          result = await this.getClientVersion();
          break;
        case BundlerRPCMethods.eth_estimateUserOperationGas:
          break;
        case BundlerRPCMethods.debug_bundler_setBundlingMode:
          await this.setBundlingMode(params[0]);
          result = 'ok';
          break;
        case BundlerRPCMethods.debug_bundler_clearState:
        case BundlerRPCMethods.debug_bundler_dumpMempool:
        case BundlerRPCMethods.debug_bundler_setReputation:
        case BundlerRPCMethods.debug_bundler_dumpReputation:
        case BundlerRPCMethods.debug_bundler_setBundleInterval:
        case BundlerRPCMethods.debug_bundler_sendBundleNow:
          result = 'ok';
          break;
        default:
          throw new RpcError(`Method ${method} is not supported`, -32601);
      }
    } catch (err) {
      return next(err);
    }
    result = deepHexlify(result);
    res.json({
      jsonrpc,
      id,
      result
    });
  }

  async getSupportedEntryPoints(): Promise<SupportedEntryPoints> {
    if (this.relayer.entryPoint) {
      return [this.relayer.entryPoint];
    }
    return [];
  }

  async getChainId(): Promise<EthChainIdResponse> {
    const chainId = NETWORK_NAME_TO_CHAIN_ID[this.network];
    if (!chainId) {
      throw new RpcError(`Method ${BundlerRPCMethods.eth_chainId} is not supported`, -32601);
    }
    return {
      chainId
    };
  }

  async setBundlingMode(mode: BundlingMode) {
    if (mode !== 'auto' && mode !== 'manual') {
      throw new RpcError(`Method ${BundlerRPCMethods.debug_bundler_setBundlingMode} is not supported`, -32601);
    }
    this.bundlingMode = mode;
  }

  getClientVersion(): string {
    return require('../../package.json').version;
  }
}
