import { NETWORK_NAME_TO_CHAIN_ID, NetworkName } from "types/lib";
import { IDbController } from "types/lib";
import { Executor } from "executor/lib/executor";
import { Config } from "executor/lib/config";
import RpcError from "types/lib/api/errors/rpc-error";
import * as RpcErrorCodes from "types/lib/api/errors/rpc-error-codes";
import { FastifyInstance, RouteHandler } from "fastify";
import logger from "./logger";
import {
  BundlerRPCMethods,
  CustomRPCMethods,
  RedirectedRPCMethods,
} from "./constants";
import { EthAPI, DebugAPI, Web3API, RedirectAPI } from "./modules";
import { deepHexlify } from "./utils";

export interface RpcHandlerOptions {
  network: NetworkName;
  db: IDbController;
  config: Config;
}

export interface EtherspotBundlerOptions {
  server: FastifyInstance;
  config: Config;
  db: IDbController;
  testingMode: boolean;
  redirectRpc: boolean;
}

export interface RelayerAPI {
  relayer: Executor;
  ethApi: EthAPI;
  debugApi: DebugAPI;
  web3Api: Web3API;
}

export class ApiApp {
  private server: FastifyInstance;
  private config: Config;
  private db: IDbController;
  private relayers: RelayerAPI[] = [];

  private testingMode = false;
  private redirectRpc = false;

  constructor(options: EtherspotBundlerOptions) {
    this.server = options.server;
    this.config = options.config;
    this.db = options.db;
    this.testingMode = options.testingMode;
    this.redirectRpc = options.redirectRpc;
    this.setupRoutes();
  }

  private setupRoutes(): void {
    if (this.testingMode) {
      this.server.post("/rpc/", this.setupRouteFor("dev"));
      logger.info("Setup route for dev: /rpc/");
      return;
    }

    const networkNames: NetworkName[] = this.config.supportedNetworks;
    for (const network of networkNames) {
      const chainId: number | undefined = NETWORK_NAME_TO_CHAIN_ID[network];
      if (chainId == undefined) {
        continue;
      }
      this.server.post(`/${chainId}`, this.setupRouteFor(network));
      logger.info(`Setup route for ${network}: /${chainId}/`);
    }
  }

  private setupRouteFor(network: NetworkName): RouteHandler {
    const relayer = new Executor({
      network,
      db: this.db,
      config: this.config,
      logger: logger,
    });
    const ethApi = new EthAPI(relayer.eth);
    const debugApi = new DebugAPI(relayer.debug);
    const web3Api = new Web3API(relayer.web3);
    const redirectApi = new RedirectAPI(network, this.config);

    this.relayers.push({
      relayer,
      ethApi,
      debugApi,
      web3Api,
    });

    return async (req, res): Promise<void> => {
      let result: any = undefined;
      const { method, params, jsonrpc, id } = req.body as any;

      // ADMIN METHODS
      if (this.testingMode || req.ip === "localhost") {
        switch (method) {
          case BundlerRPCMethods.debug_bundler_setBundlingMode:
            result = await debugApi.setBundlingMode(params[0]);
            break;
          case BundlerRPCMethods.debug_bundler_setBundleInterval:
            result = await debugApi.setBundlingInterval({
              interval: params[0],
            });
            break;
          case BundlerRPCMethods.debug_bundler_clearState:
            result = await debugApi.clearState();
            break;
          case BundlerRPCMethods.debug_bundler_dumpMempool:
            result = await debugApi.dumpMempool(/* params[0] */);
            break;
          case BundlerRPCMethods.debug_bundler_setReputation:
            result = await debugApi.setReputation({
              reputations: params[0],
              entryPoint: params[1],
            });
            break;
          case BundlerRPCMethods.debug_bundler_dumpReputation:
            result = await debugApi.dumpReputation({
              entryPoint: params[0],
            });
            break;
          case BundlerRPCMethods.debug_bundler_sendBundleNow:
            result = await debugApi.sendBundleNow();
            break;
        }
      }

      if (this.redirectRpc && method in RedirectedRPCMethods) {
        const body = await redirectApi.redirect(method, params);
        return res.status(200).send({
          jsonrpc,
          id,
          ...body,
        });
      }

      if (result === undefined) {
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
          case CustomRPCMethods.eth_validateUserOperation:
            result = await ethApi.validateUserOp({
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
          default:
            throw new RpcError(
              `Method ${method} is not supported`,
              RpcErrorCodes.METHOD_NOT_FOUND
            );
        }
      }

      result = deepHexlify(result);
      return res.status(200).send({
        jsonrpc,
        id,
        result,
      });
    };
  }
}
