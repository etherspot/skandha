import {
  Application,
  NextFunction,
  Request,
  RequestHandler,
  Response,
} from "express";
import { BigNumber, ethers, providers } from "ethers";
import { NETWORK_NAME_TO_CHAIN_ID, NetworkName } from "types/lib";
import { DbController } from "db/lib";
import { NetworkConfig } from "./config";
import logger from "./logger";
import RpcError from "./errors/rpc-error";
import * as RpcErrorCodes from "./errors/rpc-error-codes";
import { BundlerRPCMethods } from "./constants";
import { Web3, Debug, Eth } from "./modules";
import { deepHexlify } from "./utils";
import {
  MempoolService,
  UserOpValidationService,
  BundlingService,
  ReputationService,
} from "./services";
import { Config } from "./config";

export interface RpcHandlerOptions {
  network: NetworkName;
  db: DbController;
  config: Config;
}

export class RpcHandler {
  private network: NetworkName;
  private networkConfig: NetworkConfig;
  private config: Config;
  private provider: providers.JsonRpcProvider;

  private web3: Web3;
  private debug: Debug;
  private eth: Eth;

  private bundlingService: BundlingService;
  private mempoolService: MempoolService;
  private userOpValidationService: UserOpValidationService;
  private reputationService: ReputationService;

  private db: DbController;

  constructor(options: RpcHandlerOptions) {
    this.db = options.db;
    this.network = options.network;
    this.config = options.config;
    this.networkConfig = options.config.networks[
      options.network
    ] as NetworkConfig;

    this.provider = new ethers.providers.JsonRpcProvider(
      this.networkConfig.rpcEndpoint
    );

    const chainId = Number(NETWORK_NAME_TO_CHAIN_ID[this.network]);
    this.reputationService = new ReputationService(
      this.db,
      chainId,
      this.networkConfig.minInclusionDenominator,
      this.networkConfig.throttlingSlack,
      this.networkConfig.banSlack,
      BigNumber.from(1),
      0
    );
    this.userOpValidationService = new UserOpValidationService(
      this.provider,
      this.reputationService
    );
    this.mempoolService = new MempoolService(
      this.db,
      chainId,
      this.reputationService
    );
    this.bundlingService = new BundlingService(
      this.network,
      this.provider,
      this.mempoolService,
      this.userOpValidationService,
      this.reputationService,
      this.config
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
      this.mempoolService,
      this.networkConfig
    );

    logger.info(`Initalized RPC Handler for ${this.network}`);
  }

  async methodHandler(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    let result: any;
    const { method, params, jsonrpc, id } = req.body;
    try {
      switch (method) {
        case BundlerRPCMethods.eth_supportedEntryPoints:
          result = await this.eth.getSupportedEntryPoints();
          break;
        case BundlerRPCMethods.eth_chainId:
          result = await this.eth.getChainId();
          break;
        case BundlerRPCMethods.eth_sendUserOperation:
          result = await this.eth.sendUserOperation({
            userOp: params[0],
            entryPoint: params[1],
          });
          break;
        case BundlerRPCMethods.eth_estimateUserOperationGas:
          result = await this.eth.estimateUserOperationGas({
            userOp: params[0],
            entryPoint: params[1],
          });
          break;
        case BundlerRPCMethods.eth_getUserOperationReceipt:
          result = await this.eth.getUserOperationReceipt(params[0]);
          break;
        case BundlerRPCMethods.eth_getUserOperationByHash:
          result = await this.eth.getUserOperationByHash(params[0]);
          break;
        case BundlerRPCMethods.web3_clientVersion:
          result = this.web3.clientVersion();
          break;
        case BundlerRPCMethods.debug_bundler_setBundlingMode:
          result = await this.debug.setBundlingMode(params[0]);
          break;
        case BundlerRPCMethods.debug_bundler_clearState:
          result = await this.debug.clearState();
          break;
        case BundlerRPCMethods.debug_bundler_dumpMempool:
          result = await this.debug.dumpMempool(/* params[0] */);
          break;
        case BundlerRPCMethods.debug_bundler_setReputation:
          result = await this.debug.setReputation(/* params[0], params[1] */);
          break;
        case BundlerRPCMethods.debug_bundler_dumpReputation:
          result =
            await this.debug.dumpReputation(/* { entryPoint: params[0] } */);
          break;
        case BundlerRPCMethods.debug_bundler_sendBundleNow:
          result = await this.debug.sendBundleNow();
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
  }
}

export interface EtherspotBundlerOptions {
  server: Application;
  config: Config;
  db: DbController;
}

export class BundlerApp {
  private server: Application;
  private config: Config;
  private db: DbController;

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
    const rpcHandler = new RpcHandler({
      network,
      config: this.config,
      db: this.db,
    });
    return rpcHandler.methodHandler.bind(rpcHandler);
  }
}
