import {
  Application,
  NextFunction,
  Request,
  RequestHandler,
  Response,
} from "express";
import { NETWORK_NAME_TO_CHAIN_ID, NetworkName } from "types/lib";
import { DbController } from "db/lib";
import { Executor } from "executor/lib/executor";
import { Config } from "executor/lib/config";
import RpcError from "types/lib/api/errors/rpc-error";
import * as RpcErrorCodes from "types/lib/api/errors/rpc-error-codes";
import logger from "./logger";
import { BundlerRPCMethods } from "./constants";
import { EthAPI, DebugAPI, Web3API } from "./modules";
import { deepHexlify } from "./utils";

export interface RpcHandlerOptions {
  network: NetworkName;
  db: DbController;
  config: Config;
}

export interface EtherspotBundlerOptions {
  server: Application;
  config: Config;
  db: DbController;
}

export interface RelayerAPI {
  relayer: Executor;
  ethApi: EthAPI;
  debugApi: DebugAPI;
  web3Api: Web3API;
}

export class ApiApp {
  private server: Application;
  private config: Config;
  private db: DbController;
  private relayers: RelayerAPI[] = [];

  constructor(options: EtherspotBundlerOptions) {
    this.server = options.server;
    this.config = options.config;
    this.db = options.db;
    this.setupRoutes();
  }

  private setupRoutes(): void {
    const networkNames: NetworkName[] = this.config.supportedNetworks;
    for (const network of networkNames) {
      const chainId: number | undefined = NETWORK_NAME_TO_CHAIN_ID[network];
      if (chainId == undefined) {
        continue;
      }
      this.server.post(`/${chainId}/`, this.setupRouteFor(network));
      logger.info(`Setup route for ${network}: /${chainId}/`);
    }
  }

  private setupRouteFor(network: NetworkName): RequestHandler {
    const relayer = new Executor({
      network,
      db: this.db,
      config: this.config,
      logger: logger,
    });
    const ethApi = new EthAPI(relayer.eth);
    const debugApi = new DebugAPI(relayer.debug);
    const web3Api = new Web3API(relayer.web3);

    this.relayers.push({
      relayer,
      ethApi,
      debugApi,
      web3Api,
    });

    return async (
      req: Request,
      res: Response,
      next: NextFunction
    ): Promise<void> => {
      let result: any;
      const { method, params, jsonrpc, id } = req.body;
      try {
        switch (method) {
          case BundlerRPCMethods.eth_supportedEntryPoints:
            result = await ethApi.getSupportedEntryPoints();
            break;
          case BundlerRPCMethods.eth_chainId:
            result = await ethApi.getChainId();
            break;
          case BundlerRPCMethods.eth_sendUserOperation:
            result = await ethApi.sendUserOperation({
              userOp: params[0],
              entryPoint: params[1],
            });
            break;
          case BundlerRPCMethods.eth_estimateUserOperationGas:
            result = await ethApi.estimateUserOperationGas({
              userOp: params[0],
              entryPoint: params[1],
            });
            break;
          case BundlerRPCMethods.eth_getUserOperationReceipt:
            result = await ethApi.getUserOperationReceipt(params[0]);
            break;
          case BundlerRPCMethods.eth_getUserOperationByHash:
            result = await ethApi.getUserOperationByHash(params[0]);
            break;
          case BundlerRPCMethods.web3_clientVersion:
            result = web3Api.clientVersion();
            break;
          case BundlerRPCMethods.debug_bundler_setBundlingMode:
            result = await debugApi.setBundlingMode(params[0]);
            break;
          case BundlerRPCMethods.debug_bundler_clearState:
            result = await debugApi.clearState();
            break;
          case BundlerRPCMethods.debug_bundler_dumpMempool:
            result = await debugApi.dumpMempool(/* params[0] */);
            break;
          case BundlerRPCMethods.debug_bundler_setReputation:
            result = await debugApi.setReputation(/* params[0], params[1] */);
            break;
          case BundlerRPCMethods.debug_bundler_dumpReputation:
            result =
              await debugApi.dumpReputation(/* { entryPoint: params[0] } */);
            break;
          case BundlerRPCMethods.debug_bundler_sendBundleNow:
            result = await debugApi.sendBundleNow();
            break;
          default:
            throw new RpcError(
              `Method ${method} is not supported`,
              RpcErrorCodes.METHOD_NOT_FOUND
            );
        }
      } catch (err) {
        return next(err);
      }
      result = deepHexlify(result);
      res.json({
        jsonrpc,
        id,
        result,
      });
    };
  }
}
