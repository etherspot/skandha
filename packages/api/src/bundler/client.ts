import { Application, RequestHandler } from 'express';
import { NETWORK_NAME_TO_CHAIN_ID, NetworkNames } from 'etherspot';
import { Config } from '../config';
import { RpcHandler } from './rpcHandler';
import logger from '../logger';

export interface EtherspotBundlerOptions {
  config: Config;

  server: Application;
}

export class EtherspotBundlerClient {
  private config: Config;

  private server: Application;

  constructor(options: EtherspotBundlerOptions) {
    this.server = options.server;
    this.config = options.config;
    this.setupRoutes();
  }

  private setupRoutes() {
    const networkNames = this.config.supportedNetworks;
    for (const network of networkNames) {
      const chainId = NETWORK_NAME_TO_CHAIN_ID[network.toString()];
      this.server.post(`/${chainId}/`, this.setupRouteFor(network));
      logger.info(`Setup route for ${network}: /${chainId}/`);
    }
  }
  
  private setupRouteFor(network: NetworkNames): RequestHandler {
    const config = this.config.networks.get(network);
    if (!config) {
      logger.error(`No config for ${network}`);
      throw new Error(`No config for ${network}`);
    }
    const rpcHandler = new RpcHandler({
      network,
      config
    });
    return rpcHandler.methodHandler.bind(rpcHandler);
  }
};
