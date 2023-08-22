import { BigNumber, ethers } from "ethers";
import { NetworkName } from "types/lib";
import { GetGasPriceResponse } from "types/lib/api/interfaces";
import RpcError from "types/lib/api/errors/rpc-error";
import * as RpcErrorCodes from "types/lib/api/errors/rpc-error-codes";
import { GasPriceMarkupOne } from "params/lib";
import { getGasFee } from "params/lib";
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
}
