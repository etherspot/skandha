import { NetworkNames } from 'etherspot';
import { NextFunction, Request, Response } from 'express';
import { RelayerConfigOptions } from './config';
import logger from './logger';

export interface RpcHandlerOptions {
  network: NetworkNames
  relayer: RelayerConfigOptions
}

export class RpcHandler {
  private network: NetworkNames;

  private relayer: RelayerConfigOptions;


  constructor(options: RpcHandlerOptions) {
    this.network = options.network;
    this.relayer = options.relayer;
  }
  
  public methodHandler(req: Request, res: Response, next: NextFunction) {
    logger.info(`[RPC] - ${this.network}`, {
      entryPoint: this.relayer.entryPoint
    });
  }
}