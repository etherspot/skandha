import { NetworkNames } from 'etherspot';
import { NextFunction, Request, Response } from 'express';
import {
  SupportedEntryPoints
} from 'app/@types';
import { RelayerConfigOptions } from 'app/config';
import RpcError from 'app/errors/rpc-error';
import * as RpcErrorCodes from './rpc/error-codes';
import { BundlerRPCMethods } from './constants';
import { EntryPointContract } from './contracts/EntryPoint';
import { ethers, providers } from 'ethers';
import { Web3, Debug, Eth } from './rpc/modules';
import { deepHexlify } from './utils';

export interface RpcHandlerOptions {
  network: NetworkNames
  relayer: RelayerConfigOptions
}

export class RpcHandler {
  private network: NetworkNames;
  private relayer: RelayerConfigOptions;
  private provider: providers.Provider;

  private web3: Web3;
  private debug: Debug;
  private eth: Eth;

  constructor(options: RpcHandlerOptions) {
    this.network = options.network;
    this.relayer = options.relayer;

    if (!this.relayer.entryPoint) {
      throw new Error(`Invalid ${this.network} relayer config`);
    }

    this.provider = new ethers.providers.JsonRpcProvider(this.relayer.rpcEndpoint);

    this.web3 = new Web3();
    this.debug = new Debug();
    this.eth = new Eth(this.provider);
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
          result = await this.eth.getChainId();
          break;
        case BundlerRPCMethods.eth_sendUserOperation:
        case BundlerRPCMethods.eth_estimateUserOperationGas:
          result = await this.eth.estimateUserOperationGas({
            userOp: params[0], entryPoint: params[1]
          });
          break;
        case BundlerRPCMethods.eth_getUserOperationReceipt:
          result = await this.eth.getUserOperationReceipt(params[0]);
          break;
        case BundlerRPCMethods.eth_getUserOperationByHash:
          result = await this.eth.getUserOperationByHash(params[0]);
          break;
        case BundlerRPCMethods.web3_clientVersion:
          result = await this.web3.clientVersion();
          break;
        case BundlerRPCMethods.debug_bundler_setBundlingMode:
          result = await this.debug.setBundlingMode(params[0]);
          break;
        case BundlerRPCMethods.debug_bundler_clearState:
          result = await this.debug.clearState();
          break;
        case BundlerRPCMethods.debug_bundler_dumpMempool:
          result = await this.debug.dumpMempool(params[0]);
          break;
        case BundlerRPCMethods.debug_bundler_setReputation:
          result = await this.debug.setReputation(params[0], params[1]);
          break;
        case BundlerRPCMethods.debug_bundler_dumpReputation:
          result = await this.debug.dumpReputation({ entryPoint: params[0]});
          break;
        case BundlerRPCMethods.debug_bundler_sendBundleNow:
          result = await this.debug.sendBundleNow();
          break;
        default:
          throw new RpcError(`Method ${method} is not supported`, RpcErrorCodes.METHOD_NOT_FOUND);
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
}
