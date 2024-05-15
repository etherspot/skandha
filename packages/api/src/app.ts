import { Executor } from "@skandha/executor/lib/executor";
import { Config } from "@skandha/executor/lib/config";
import RpcError from "@skandha/types/lib/api/errors/rpc-error";
import * as RpcErrorCodes from "@skandha/types/lib/api/errors/rpc-error-codes";
import { FastifyInstance, RouteHandler } from "fastify";
import {
  BundlerRPCMethods,
  CustomRPCMethods,
  HttpStatus,
  RedirectedRPCMethods,
} from "./constants";
import { EthAPI, DebugAPI, Web3API, RedirectAPI } from "./modules";
import { deepHexlify } from "./utils";
import { SkandhaAPI } from "./modules/skandha";

export interface RpcHandlerOptions {
  config: Config;
}

export interface EtherspotBundlerOptions {
  server: FastifyInstance;
  config: Config;
  executor: Executor;
  testingMode: boolean;
  redirectRpc: boolean;
}

export interface RelayerAPI {
  relayer: Executor;
  ethApi: EthAPI;
  debugApi: DebugAPI;
  web3Api: Web3API;
  skandhaApi: SkandhaAPI;
}

export class ApiApp {
  private server: FastifyInstance;
  private config: Config;
  private executor: Executor;

  private testingMode = false;
  private redirectRpc = false;

  constructor(options: EtherspotBundlerOptions) {
    this.server = options.server;
    this.config = options.config;
    this.testingMode = options.testingMode;
    this.redirectRpc = options.redirectRpc;
    this.executor = options.executor;
    this.server.post("/rpc/", this.setupRoutes());
  }

  private setupRoutes(): RouteHandler {
    const { executor } = this;
    const ethApi = new EthAPI(executor.eth);
    const debugApi = new DebugAPI(executor.debug);
    const web3Api = new Web3API(executor.web3);
    const redirectApi = new RedirectAPI(this.config);
    const skandhaApi = new SkandhaAPI(executor.eth, executor.skandha);

    const handleRpc = async (ip: string, request: any): Promise<any> => {
      let result: any;
      const { method, params, jsonrpc, id } = request;
      // ADMIN METHODS
      if (this.testingMode || ip === "localhost" || ip === "127.0.0.1") {
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
          case BundlerRPCMethods.debug_bundler_clearMempool:
            result = await debugApi.clearMempool();
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

          case BundlerRPCMethods.debug_bundler_setMempool:
            result = await debugApi.setMempool({
              userOps: params[0],
              entryPoint: params[1],
            });
            break;
          case BundlerRPCMethods.debug_bundler_getStakeStatus:
            result = await debugApi.getStakeStatus({
              address: params[0],
              entryPoint: params[1],
            });
            break;
        }
      }

      if (this.redirectRpc && method in RedirectedRPCMethods) {
        const body = await redirectApi.redirect(method, params);
        if (body.error) {
          return { ...body, id };
        }
        return { jsonrpc, id, ...body };
      }

      if (!result) {
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
          case BundlerRPCMethods.eth_estimateUserOperationGas: {
            if (this.testingMode) {
              result = await ethApi.estimateUserOpGasAndValidateSignature({
                userOp: params[0],
                entryPoint: params[1],
              });
            } else {
              result = await ethApi.estimateUserOperationGas({
                userOp: params[0],
                entryPoint: params[1],
              });
            }
            break;
          }
          case BundlerRPCMethods.eth_getUserOperationReceipt:
            result = await ethApi.getUserOperationReceipt(params[0]);
            break;
          case BundlerRPCMethods.eth_getUserOperationByHash:
            result = await ethApi.getUserOperationByHash(params[0]);
            break;
          case BundlerRPCMethods.web3_clientVersion:
            result = web3Api.clientVersion();
            break;
          case CustomRPCMethods.skandha_validateUserOperation:
            result = await skandhaApi.validateUserOp({
              userOp: params[0],
              entryPoint: params[1],
            });
            break;
          case CustomRPCMethods.skandha_getGasPrice:
            result = await skandhaApi.getGasPrice();
            break;
          case CustomRPCMethods.skandha_feeHistory:
            result = await skandhaApi.getFeeHistory({
              entryPoint: params[0],
              blockCount: params[1],
              newestBlock: params[2],
            });
            break;
          case CustomRPCMethods.skandha_config:
            result = await skandhaApi.getConfig();
            // skip hexlify for this particular rpc
            return { jsonrpc, id, result };
          default:
            throw new RpcError(
              `Method ${method} is not supported`,
              RpcErrorCodes.METHOD_NOT_FOUND
            );
        }
      }

      result = deepHexlify(result);
      return { jsonrpc, id, result };
    };

    return async (req, res): Promise<void> => {
      let response: any = null;
      if (Array.isArray(req.body)) {
        response = [];
        for (const request of req.body) {
          response.push(await handleRpc(req.ip, request));
        }
      } else {
        response = await handleRpc(req.ip, req.body);
      }
      return res.status(HttpStatus.OK).send(response);
    };
  }
}
