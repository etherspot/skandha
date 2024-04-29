import { BigNumber, BigNumberish, ethers } from "ethers";
import { Logger } from "types/lib";
import {
  GetConfigResponse,
  GetFeeHistoryResponse,
  GetGasPriceResponse,
  UserOperationStatus,
} from "types/lib/api/interfaces";
import RpcError from "types/lib/api/errors/rpc-error";
import * as RpcErrorCodes from "types/lib/api/errors/rpc-error-codes";
import { GasPriceMarkupOne } from "params/lib";
import { getGasFee } from "params/lib";
import { IEntryPoint__factory } from "types/lib/executor/contracts";
import { UserOperationStruct } from "types/lib/executor/contracts/EntryPoint";
import { MempoolEntryStatus } from "types/lib/executor";
import { GetNodeAPI, NetworkConfig } from "../interfaces";
import { Config } from "../config";
import { MempoolService } from "../services";

// custom features of Skandha
export class Skandha {
  networkConfig: NetworkConfig;

  constructor(
    private getNodeAPI: GetNodeAPI = () => null,
    private mempoolService: MempoolService,
    private chainId: number,
    private provider: ethers.providers.JsonRpcProvider,
    private config: Config,
    private logger: Logger
  ) {
    const networkConfig = this.config.getNetworkConfig();
    this.networkConfig = networkConfig;
    void this.getConfig().then((config) => this.logger.debug(config));
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
      minUnstakeDelay: this.networkConfig.minUnstakeDelay,
      minSignerBalance: `${ethers.utils.formatEther(
        this.networkConfig.minSignerBalance
      )} eth`,
      minStake: `${ethers.utils.formatEther(this.networkConfig.minStake!)} eth`,
      multicall: this.networkConfig.multicall,
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
      pvgMarkup: this.networkConfig.pvgMarkup,
      canonicalMempoolId: this.networkConfig.canonicalMempoolId,
      canonicalEntryPoint: this.networkConfig.canonicalEntryPoint,
      cglMarkup: this.networkConfig.cglMarkup,
      vglMarkup: this.networkConfig.vglMarkup,
      skipBundleValidation: this.networkConfig.skipBundleValidation,
      entryPointForwarder: this.networkConfig.entryPointForwarder,
      gasFeeInSimulation: this.networkConfig.gasFeeInSimulation,
      userOpGasLimit: this.networkConfig.userOpGasLimit,
      bundleGasLimit: this.networkConfig.bundleGasLimit,
      archiveDuration: this.networkConfig.archiveDuration,
      fastlaneValidators: this.networkConfig.fastlaneValidators,
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
    const contract = IEntryPoint__factory.connect(entryPoint, this.provider);
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
      .map((handleOps) => handleOps!.ops as UserOperationStruct[])
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

  // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
  async getPeers() {
    const nodeApi = this.getNodeAPI();
    if (!nodeApi) return [];
    return nodeApi.getPeers();
  }
}
