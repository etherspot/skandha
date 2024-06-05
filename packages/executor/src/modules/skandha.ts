import { BigNumber, BigNumberish, ethers } from "ethers";
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
import { NetworkConfig } from "../interfaces";
import { Config } from "../config";
import { EntryPointService, MempoolService } from "../services";
import { EntryPointVersion } from "../services/EntryPointService/interfaces";

// custom features of Skandha
export class Skandha {
  networkConfig: NetworkConfig;

  constructor(
    private mempoolService: MempoolService,
    private entryPointService: EntryPointService,
    private chainId: number,
    private provider: ethers.providers.JsonRpcProvider,
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
      this.provider,
      this.networkConfig.etherscanApiKey
    );
    let { maxPriorityFeePerGas, maxFeePerGas } = gasFee;

    if (maxPriorityFeePerGas === undefined || maxFeePerGas === undefined) {
      try {
        const gasPrice = await this.provider.getGasPrice();
        maxPriorityFeePerGas = gasPrice;
        maxFeePerGas = gasPrice;
      } catch (err) {
        throw new RpcError(
          "Could not fetch gas prices",
          RpcErrorCodes.SERVER_ERROR
        );
      }
    }

    if (multiplier && !BigNumber.from(multiplier).eq(0)) {
      const bnMultiplier = GasPriceMarkupOne.add(multiplier);
      maxFeePerGas = bnMultiplier.mul(maxFeePerGas).div(GasPriceMarkupOne);
      maxPriorityFeePerGas = bnMultiplier
        .mul(maxPriorityFeePerGas)
        .div(GasPriceMarkupOne);
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
        walletAddresses.push(await wallet.getAddress());
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
      minInclusionDenominator: BigNumber.from(
        this.networkConfig.minInclusionDenominator
      ).toNumber(),
      throttlingSlack: BigNumber.from(
        this.networkConfig.throttlingSlack
      ).toNumber(),
      banSlack: BigNumber.from(this.networkConfig.banSlack).toNumber(),
      minStake: this.networkConfig.minStake,
      minUnstakeDelay: this.networkConfig.minUnstakeDelay,
      minSignerBalance: `${ethers.utils.formatEther(
        this.networkConfig.minSignerBalance
      )} eth`,
      multicall: this.networkConfig.multicall,
      estimationStaticBuffer: BigNumber.from(
        this.networkConfig.estimationStaticBuffer
      ).toNumber(),
      validationGasLimit: BigNumber.from(
        this.networkConfig.validationGasLimit
      ).toNumber(),
      receiptLookupRange: BigNumber.from(
        this.networkConfig.receiptLookupRange
      ).toNumber(),
      etherscanApiKey: hasEtherscanApiKey,
      conditionalTransactions: this.networkConfig.conditionalTransactions,
      rpcEndpointSubmit: hasExecutionRpc,
      gasPriceMarkup: BigNumber.from(
        this.networkConfig.gasPriceMarkup
      ).toNumber(),
      enforceGasPrice: this.networkConfig.enforceGasPrice,
      enforceGasPriceThreshold: BigNumber.from(
        this.networkConfig.enforceGasPriceThreshold
      ).toNumber(),
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
    };
  }

  /**
   * see eth_feeHistory
   * @param entryPoint Entry Point contract
   * @param blockCount Number of blocks in the requested range
   * @param newestBlock Highest number block of the requested range, or "latest"
   */
  async getFeeHistory(
    entryPoint: string,
    blockCount: BigNumberish,
    newestBlock: BigNumberish | string
  ): Promise<GetFeeHistoryResponse> {
    const toBlockInfo = await this.provider.getBlock(newestBlock.toString());
    const fromBlockNumber = BigNumber.from(toBlockInfo.number)
      .sub(blockCount)
      .toNumber();
    const epVersion = this.entryPointService.getEntryPointVersion(entryPoint);
    if (
      epVersion === EntryPointVersion.SIX ||
      epVersion === EntryPointVersion.SEVEN
    ) {
      const contract =
        this.entryPointService.getEntryPoint(entryPoint).contract;
      const events = await contract.queryFilter(
        contract.filters.UserOperationEvent(),
        fromBlockNumber,
        toBlockInfo.number
      );
      const txReceipts = await Promise.all(
        events.map((event) => event.getTransaction())
      );
      const txDecoded = txReceipts
        .map((receipt) => {
          try {
            return contract.interface.decodeFunctionData(
              "handleOps",
              receipt.data
            );
          } catch (err) {
            this.logger.error(err);
            return null;
          }
        })
        .filter((el) => el !== null);

      const actualGasPrice = events.map((event) =>
        BigNumber.from(event.args.actualGasCost).div(event.args.actualGasUsed)
      );
      const userops = txDecoded
        .map((handleOps) => handleOps!.ops as UserOperation[])
        .reduce((p, c) => {
          return p.concat(c);
        }, []);
      return {
        actualGasPrice,
        maxFeePerGas: userops.map((userop) => userop.maxFeePerGas),
        maxPriorityFeePerGas: userops.map(
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
