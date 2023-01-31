import { NETWORK_NAME_TO_CHAIN_ID, NetworkNames } from 'etherspot';
import { NextFunction, Request, Response } from 'express';
import {
  SupportedEntryPoints
} from 'app/@types';
import { RelayerConfigOptions } from 'app/config';
import logger from 'app/logger';
import RpcError from 'app/errors/rpc-error';
import * as RpcErrorCodes from './rpc/error-codes';
import { BundlerRPCMethods } from './constants';
import { Wallet, ethers, providers } from 'ethers';
import { Web3, Debug, Eth } from './rpc/modules';
import { deepHexlify } from './utils';
import {
  MempoolService,
  UserOpValidationService,
  BundlingService,
  ReputationService
} from './rpc/services';

export interface RpcHandlerOptions {
  network: NetworkNames
  relayer: RelayerConfigOptions
}

export class RpcHandler {
  private network: NetworkNames;
  private relayer: RelayerConfigOptions;
  private provider: providers.JsonRpcProvider;
  private wallet: Wallet;

  private web3: Web3;
  private debug: Debug;
  private eth: Eth;

  private bundlingService: BundlingService;
  private mempoolService: MempoolService;
  private userOpValidationService: UserOpValidationService;
  private reputationService: ReputationService;

  constructor(options: RpcHandlerOptions) {
    this.network = options.network;
    this.relayer = options.relayer;

    if (!this.relayer.entryPoint || !this.relayer.privateKey) {
      throw new Error(`Invalid ${this.network} relayer config`);
    }

    this.provider = new ethers.providers.JsonRpcProvider(this.relayer.rpcEndpoint);
    this.wallet = new Wallet(this.relayer.privateKey, this.provider);

    this.userOpValidationService = new UserOpValidationService(this.provider);
    const chainId = Number(NETWORK_NAME_TO_CHAIN_ID[this.network]);
    this.mempoolService = new MempoolService(chainId);
    this.bundlingService = new BundlingService(
      this.provider,
      this.wallet,
      this.mempoolService,
      this.userOpValidationService
    );
    this.reputationService = new ReputationService(
      chainId,
      this.relayer.minInclusionDenominator,
      this.relayer.throttlingSlack,
      this.relayer.banSlack
    );

    this.web3 = new Web3();
    this.debug = new Debug(
      this.provider,
      this.bundlingService,
      this.mempoolService,
      this.reputationService
    );
    this.eth = new Eth(
      this.provider,
      this.userOpValidationService,
      this.mempoolService
    );

    logger.info(`Initalized RPC Handler for ${this.network}`, {
      data: {
        from: this.wallet.address
      }
    });
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
          result = await this.eth.sendUserOperation({
            userOp: params[0], entryPoint: params[1]
          });
          break;
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
