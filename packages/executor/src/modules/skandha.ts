import { Logger } from "@skandha/types/lib";
import {
  GetConfigResponse,
  GetFeeHistoryResponse,
  GetGasPriceResponse,
} from "@skandha/types/lib/api/interfaces";
import RpcError from "@skandha/types/lib/api/errors/rpc-error";
import * as RpcErrorCodes from "@skandha/types/lib/api/errors/rpc-error-codes";
import { GasPriceMarkupOne } from "@skandha/params/lib";
import { getGasFee } from "@skandha/params/lib";
import { UserOperationStatus } from "@skandha/types/lib/api/interfaces";
import { MempoolEntryStatus } from "@skandha/types/lib/executor";
import { UserOperation } from "@skandha/types/lib/contracts/UserOperation";
import { Hex, PublicClient, decodeFunctionData, formatEther, getContract, parseAbiItem } from "viem";
import { NetworkConfig } from "../interfaces";
import { Config } from "../config";
import { EntryPointService, MempoolService } from "../services";
import { EntryPointVersion } from "../services/EntryPointService/interfaces";
import { PackedUserOperation } from "viem/_types/account-abstraction/types/userOperation";
import { unpackUserOp } from "../services/EntryPointService/utils";

type BigNumberish = bigint | number | `0x${string}` | `${number}` | string;

// custom features of Skandha
export class Skandha {
  networkConfig: NetworkConfig;

  constructor(
    private mempoolService: MempoolService,
    private entryPointService: EntryPointService,
    private chainId: number,
    private publicClient: PublicClient,
    private config: Config,
    private logger: Logger
  ) {
    const networkConfig = this.config.getNetworkConfig();
    this.networkConfig = networkConfig;
  }

  async getGasPrice(): Promise<GetGasPriceResponse> {
    const multiplier = this.networkConfig.gasPriceMarkup;
    const gasFee = await getGasFee(
      this.chainId,
      this.publicClient,
      this.networkConfig.etherscanApiKey
    );
    let { maxPriorityFeePerGas, maxFeePerGas } = gasFee;

    if (maxPriorityFeePerGas === undefined || maxFeePerGas === undefined) {
      try {
        const gasPrice = await this.publicClient.getGasPrice();
        maxPriorityFeePerGas = gasPrice;
        maxFeePerGas = gasPrice;
      } catch (err) {
        throw new RpcError(
          "Could not fetch gas prices",
          RpcErrorCodes.SERVER_ERROR
        );
      }
    }

    if (multiplier && multiplier !== 0) {
      const bnMultiplier = GasPriceMarkupOne + BigInt(multiplier);
      maxFeePerGas = (bnMultiplier * BigInt(maxFeePerGas)) / (GasPriceMarkupOne);
      maxPriorityFeePerGas = (bnMultiplier * BigInt(maxPriorityFeePerGas)) / GasPriceMarkupOne;
    }

    return {
      maxPriorityFeePerGas,
      maxFeePerGas,
    };
  }

  async getConfig(): Promise<GetConfigResponse> {
    const wallets = this.config.getRelayers();
    const walletAddresses = [];
    if (wallets) {
      for (const wallet of wallets) {
        walletAddresses.push(wallet.account!.address);
      }
    }
    const hasEtherscanApiKey = Boolean(this.networkConfig.etherscanApiKey);
    const hasExecutionRpc = Boolean(this.networkConfig.rpcEndpointSubmit);
    return {
      chainId: this.chainId,
      flags: {
        testingMode: this.config.testingMode,
        redirectRpc: this.config.redirectRpc,
      },
      entryPoints: this.networkConfig.entryPoints,
      beneficiary: this.networkConfig.beneficiary,
      relayers: walletAddresses,
      minInclusionDenominator: this.networkConfig.minInclusionDenominator,
      throttlingSlack: this.networkConfig.throttlingSlack,
      banSlack: this.networkConfig.banSlack,
      minStake: this.networkConfig.minStake.toString(),
      minUnstakeDelay: this.networkConfig.minUnstakeDelay,
      minSignerBalance: `${formatEther(this.networkConfig.minSignerBalance)} eth`,
      multicall: this.networkConfig.multicall,
      estimationStaticBuffer: this.networkConfig.estimationStaticBuffer,
      validationGasLimit: this.networkConfig.validationGasLimit,
      receiptLookupRange: this.networkConfig.receiptLookupRange,
      etherscanApiKey: hasEtherscanApiKey,
      conditionalTransactions: this.networkConfig.conditionalTransactions,
      rpcEndpointSubmit: hasExecutionRpc,
      gasPriceMarkup: this.networkConfig.gasPriceMarkup,
      enforceGasPrice: this.networkConfig.enforceGasPrice,
      enforceGasPriceThreshold: this.networkConfig.enforceGasPriceThreshold,
      eip2930: this.networkConfig.eip2930,
      useropsTTL: this.networkConfig.useropsTTL,
      whitelistedEntities: this.networkConfig.whitelistedEntities,
      bundleGasLimitMarkup: this.networkConfig.bundleGasLimitMarkup,
      relayingMode: this.networkConfig.relayingMode,
      bundleInterval: this.networkConfig.bundleInterval,
      bundleSize: this.networkConfig.bundleSize,
      canonicalMempoolId: this.networkConfig.canonicalMempoolId,
      canonicalEntryPoint: this.networkConfig.canonicalEntryPoint,
      gasFeeInSimulation: this.networkConfig.gasFeeInSimulation,
      skipBundleValidation: this.networkConfig.skipBundleValidation,
      pvgMarkup: this.networkConfig.pvgMarkup,
      cglMarkup: this.networkConfig.cglMarkup,
      vglMarkup: this.networkConfig.vglMarkup,
      fastlaneValidators: this.networkConfig.fastlaneValidators,
      estimationGasLimit: this.networkConfig.estimationGasLimit,
      archiveDuration: this.networkConfig.archiveDuration,
      pvgMarkupPercent: this.networkConfig.pvgMarkupPercent,
      cglMarkupPercent: this.networkConfig.cglMarkupPercent,
      vglMarkupPercent: this.networkConfig.vglMarkupPercent,
      userOpGasLimit: this.networkConfig.userOpGasLimit,
      bundleGasLimit: this.networkConfig.bundleGasLimit,
      merkleApiURL: this.networkConfig.merkleApiURL,
      blockscoutUrl: this.networkConfig.blockscoutUrl,
      blockscoutApiKeys: this.networkConfig.blockscoutApiKeys.length,
      tenderlyApiUrl: this.networkConfig.tenderlyApiUrl ? true : false,
      tenderlyKey: this.networkConfig.tenderlyKey ? true : false,
      tenderlySave: this.networkConfig.tenderlySave,
      rpcTimeout: this.networkConfig.rpcTimeout,
      eip7702: this.networkConfig.eip7702,
    };
  }

  /**
   * see eth_feeHistory
   * @param entryPoint Entry Point contract
   * @param blockCount Number of blocks in the requested range
   * @param newestBlock Highest number block of the requested range, or "latest"
   */
  async getFeeHistory(
    entryPoint: Hex,
    blockCount: BigNumberish,
    newestBlock: BigNumberish
  ): Promise<GetFeeHistoryResponse> {
    const toBlockInfo = newestBlock === "latest" ? await this.publicClient.getBlock() : await this.publicClient.getBlock({blockNumber: BigInt(newestBlock)});
    const fromBlockNumber = toBlockInfo.number - BigInt(blockCount);
    const epVersion = this.entryPointService.getEntryPointVersion(entryPoint);
    if (
      epVersion === EntryPointVersion.SIX ||
      epVersion === EntryPointVersion.SEVEN
    ) {
      const contract = this.entryPointService.getEntryPoint(entryPoint).contract;
      const events = await this.publicClient.getLogs({
        address: entryPoint,
        events: [
          parseAbiItem([
            'event UserOperationEvent(bytes32 indexed userOpHash, address indexed sender, address indexed paymaster, uint256 nonce, bool success, uint256 actualGasCost, uint256 actualGasUsed)'
          ])
        ],
        fromBlock: fromBlockNumber,
        toBlock: toBlockInfo.number,
      });
      const txReceipts = await Promise.all(
        events.map((event) => this.publicClient.getTransaction({
          hash: event.transactionHash
        }))
      );
      const txDecoded = txReceipts
        .map((receipt) => {
          try {
            return decodeFunctionData({
              abi: contract.abi,
              data: receipt.input,
            })
          } catch (err) {
            this.logger.error(err);
            return null;
          }
        })
        .filter((el) => el !== null);

      const actualGasPrice = events.map((event) => {
        return event.args.actualGasCost!/event.args.actualGasUsed!
      });

      const userOps: UserOperation[] = [];
      for(const handleOps of txDecoded) {
        const packedUserOps = handleOps?.args[0] as PackedUserOperation[];
        if(packedUserOps) {
          for(const packedUserOp of packedUserOps) {
            userOps.push(unpackUserOp(packedUserOp))
          }
        }
      }

      return {
        actualGasPrice,
        maxFeePerGas: userOps.map((userop) => userop.maxFeePerGas),
        maxPriorityFeePerGas: userOps.map(
          (userop) => userop.maxPriorityFeePerGas
        ),
      };
    }

    throw new RpcError("Unsupported EntryPoint");
  }

  async getUserOperationStatus(hash: string): Promise<UserOperationStatus> {
    const entry = await this.mempoolService.getEntryByHash(hash);
    if (entry == null) {
      throw new RpcError(
        "UserOperation not found",
        RpcErrorCodes.INVALID_REQUEST
      );
    }

    const { userOp, entryPoint } = entry;
    const status =
      Object.keys(MempoolEntryStatus).find(
        (status) =>
          entry.status ===
          MempoolEntryStatus[status as keyof typeof MempoolEntryStatus]
      ) ?? "New";
    const reason = entry.revertReason;
    const transaction = entry.actualTransaction ?? entry.transaction;

    return {
      userOp,
      entryPoint,
      status,
      reason,
      transaction,
    };
  }
}
