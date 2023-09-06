import { BigNumber, BigNumberish, ethers } from "ethers";
import { NetworkName } from "types/lib";
import {
  GetFeeHistoryResponse,
  GetGasPriceResponse,
} from "types/lib/api/interfaces";
import RpcError from "types/lib/api/errors/rpc-error";
import * as RpcErrorCodes from "types/lib/api/errors/rpc-error-codes";
import { GasPriceMarkupOne } from "params/lib";
import { getGasFee } from "params/lib";
import { IEntryPoint__factory } from "types/lib/executor/contracts";
import { UserOperationStruct } from "types/lib/executor/contracts/EntryPoint";
import { Logger, NetworkConfig } from "../interfaces";

// custom features of Skandha
export class Skandha {
  constructor(
    private networkName: NetworkName,
    private provider: ethers.providers.JsonRpcProvider,
    private config: NetworkConfig,
    private logger: Logger
  ) {}

  async getGasPrice(): Promise<GetGasPriceResponse> {
    const multiplier = this.config.gasPriceMarkup;
    const gasFee = await getGasFee(
      this.networkName,
      this.provider,
      this.config.etherscanApiKey
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
}
