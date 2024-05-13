import { WebSocket } from "ws";
import { Executor } from "@skandha/executor/lib/executor";
import { Config } from "@skandha/executor/lib/config";
import RpcError from "@skandha/types/lib/api/errors/rpc-error";
import * as RpcErrorCodes from "@skandha/types/lib/api/errors/rpc-error-codes";
import { deepHexlify } from "@skandha/utils/lib/hexlify";
import {
  BundlerRPCMethods,
  CustomRPCMethods,
  HttpStatus,
  RedirectedRPCMethods,
} from "./constants";
import {
  EthAPI,
  DebugAPI,
  Web3API,
  RedirectAPI,
  SubscriptionApi,
} from "./modules";
import { SkandhaAPI } from "./modules/skandha";
import { JsonRpcRequest, JsonRpcResponse } from "./interface";
import { Server } from "./server";

export interface RpcHandlerOptions {
  config: Config;
}

export interface EtherspotBundlerOptions {
  server: Server;
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
  private server: Server;
  private config: Config;
  private executor: Executor;

  private testingMode = false;
  private redirectRpc = false;

  private ethApi: EthAPI;
  private debugApi: DebugAPI;
  private web3Api: Web3API;
  private redirectApi: RedirectAPI;
  private skandhaApi: SkandhaAPI;
  private subscriptionApi: SubscriptionApi;

  constructor(options: EtherspotBundlerOptions) {
    this.server = options.server;
    this.config = options.config;
    this.testingMode = options.testingMode;
    this.redirectRpc = options.redirectRpc;
    this.executor = options.executor;

    this.subscriptionApi = new SubscriptionApi(
      this.executor.subscriptionService
    );
    this.ethApi = new EthAPI(this.executor.eth);
    this.debugApi = new DebugAPI(this.executor.debug);
    this.web3Api = new Web3API(this.executor.web3);
    this.redirectApi = new RedirectAPI(this.config);
    this.skandhaApi = new SkandhaAPI(this.executor.eth, this.executor.skandha);

    // HTTP interface
    this.server.http.post("/rpc/", async (req, res): Promise<void> => {
      let response = null;
      if (Array.isArray(req.body)) {
        response = [];
        for (const request of req.body) {
          response.push(
            await this.handleRpcRequest(
              request,
              req.ip,
              req.headers.authorization
            )
          );
        }
      } else {
        response = await this.handleRpcRequest(
          req.body as JsonRpcRequest,
          req.ip,
          req.headers.authorization
        );
      }
      return res.status(HttpStatus.OK).send(response);
    });
    this.server.http.get("*", async (req, res) => {
      void res
        .status(200)
        .send("GET requests are not supported. Visit https://skandha.fyi");
    });

    if (this.server.ws != null) {
      this.server.ws.get("/rpc/", { websocket: true }, async (socket, _) => {
        socket.on("message", async (message) => {
          let response: Partial<JsonRpcResponse> = {};
          try {
            const request: JsonRpcRequest = JSON.parse(message.toString());
            const wsRpc = await this.handleWsRequest(
              socket,
              request as JsonRpcRequest
            );
            if (!wsRpc) {
              try {
                response = await this.handleRpcRequest(request, "");
              } catch (err) {
                const { jsonrpc, id } = request;
                if (err instanceof RpcError) {
                  response = {
                    jsonrpc,
                    id,
                    message: err.message,
                    data: err.data,
                  };
                } else if (err instanceof Error) {
                  response = { jsonrpc, id, error: err.message };
                } else {
                  response = { jsonrpc, id, error: "Internal server error" };
                }
              }
            }
          } catch (err) {
            response = { error: "Invalid Request" };
          }
          socket.send(JSON.stringify(response));
        });
      });
    }
  }

  private async handleWsRequest(
    socket: WebSocket,
    request: JsonRpcRequest
  ): Promise<boolean> {
    let response: JsonRpcResponse | undefined;
    const { method, params, jsonrpc, id } = request;
    try {
      switch (method) {
        case CustomRPCMethods.skandha_subscribe: {
          const eventId = this.subscriptionApi.subscribe(socket, params[0]);
          response = { jsonrpc, id, result: eventId };
          break;
        }
        case CustomRPCMethods.skandha_unsubscribe: {
          this.subscriptionApi.unsubscribe(socket, params[0]);
          response = { jsonrpc, id, result: "ok" };
          break;
        }
        default: {
          return false; // the request can not be handled by this function
        }
      }
    } catch (err) {
      if (err instanceof RpcError) {
        response = { jsonrpc, id, message: err.message, data: err.data };
      } else if (err instanceof Error) {
        response = { jsonrpc, id, error: err.message };
      } else {
        response = { jsonrpc, id, error: "Internal server error" };
      }
    }
    if (response != undefined) {
      socket.send(JSON.stringify(response));
    }
    return true; // the request can not be handled by this function
  }

  private async handleRpcRequest(
    request: JsonRpcRequest,
    ip: string,
    authKey?: string
  ): Promise<JsonRpcResponse> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let result: any;
    const { method, params, jsonrpc, id } = request;
    if (
      this.testingMode ||
      ip === "localhost" ||
      ip === "127.0.0.1" ||
      (process.env.SKANDHA_ADMIN_KEY &&
        authKey === process.env.SKANDHA_ADMIN_KEY)
    ) {
      switch (method) {
        case BundlerRPCMethods.debug_bundler_setBundlingMode:
          result = await this.debugApi.setBundlingMode(params[0]);
          break;
        case BundlerRPCMethods.debug_bundler_setBundleInterval:
          result = await this.debugApi.setBundlingInterval({
            interval: params[0],
          });
          break;
        case BundlerRPCMethods.debug_bundler_clearState:
          result = await this.debugApi.clearState();
          break;
        case BundlerRPCMethods.debug_bundler_clearMempool:
          result = await this.debugApi.clearMempool();
          break;
        case BundlerRPCMethods.debug_bundler_dumpMempool:
          result = await this.debugApi.dumpMempool(/* params[0] */);
          break;
        case BundlerRPCMethods.debug_bundler_dumpMempoolRaw:
          result = await this.debugApi.dumpMempoolRaw(/* params[0] */);
          break;
        case BundlerRPCMethods.debug_bundler_setReputation:
          result = await this.debugApi.setReputation({
            reputations: params[0],
            entryPoint: params[1],
          });
          break;
        case BundlerRPCMethods.debug_bundler_dumpReputation:
          result = await this.debugApi.dumpReputation({
            entryPoint: params[0],
          });
          break;
        case BundlerRPCMethods.debug_bundler_sendBundleNow:
          result = await this.debugApi.sendBundleNow();
          break;

        case BundlerRPCMethods.debug_bundler_setMempool:
          result = await this.debugApi.setMempool({
            userOps: params[0],
            entryPoint: params[1],
          });
          break;
        case BundlerRPCMethods.debug_bundler_getStakeStatus:
          result = await this.debugApi.getStakeStatus({
            address: params[0],
            entryPoint: params[1],
          });
          break;
      }
    }

    if (this.redirectRpc && method in RedirectedRPCMethods) {
      const body = await this.redirectApi.redirect(method, params);
      if (body.error) {
        return { ...body, id };
      }
      return { jsonrpc, id, ...body };
    }

    if (!result) {
      switch (method) {
        case BundlerRPCMethods.eth_supportedEntryPoints:
          result = await this.ethApi.getSupportedEntryPoints();
          break;
        case BundlerRPCMethods.eth_chainId:
          result = await this.ethApi.getChainId();
          break;
        case BundlerRPCMethods.eth_sendUserOperation:
          result = await this.ethApi.sendUserOperation({
            userOp: params[0],
            entryPoint: params[1],
          });
          break;
        case BundlerRPCMethods.eth_estimateUserOperationGas: {
          if (this.testingMode) {
            result = await this.ethApi.estimateUserOpGasAndValidateSignature({
              userOp: params[0],
              entryPoint: params[1],
            });
          } else {
            result = await this.ethApi.estimateUserOperationGas({
              userOp: params[0],
              entryPoint: params[1],
            });
          }
          break;
        }
        case BundlerRPCMethods.eth_getUserOperationReceipt:
          result = await this.ethApi.getUserOperationReceipt(params[0]);
          break;
        case BundlerRPCMethods.eth_getUserOperationByHash:
          result = await this.ethApi.getUserOperationByHash(params[0]);
          break;
        case BundlerRPCMethods.web3_clientVersion:
          result = this.web3Api.clientVersion();
          break;
        case CustomRPCMethods.skandha_getGasPrice:
          result = await this.skandhaApi.getGasPrice();
          break;
        case CustomRPCMethods.skandha_feeHistory:
          result = await this.skandhaApi.getFeeHistory({
            entryPoint: params[0],
            blockCount: params[1],
            newestBlock: params[2],
          });
          break;
        case CustomRPCMethods.skandha_config:
          result = await this.skandhaApi.getConfig();
          // skip hexlify for this particular rpc
          return { jsonrpc, id, result };
        case CustomRPCMethods.skandha_peers:
          result = await this.skandhaApi.getPeers();
          break;
        case CustomRPCMethods.skandha_userOperationStatus:
          result = await this.skandhaApi.getUserOperationStatus(params[0]);
          break;
        default:
          throw new RpcError(
            `Method ${method} is not supported`,
            RpcErrorCodes.METHOD_NOT_FOUND
          );
      }
    }

    result = deepHexlify(result);
    return { jsonrpc, id, result };
  }
}
