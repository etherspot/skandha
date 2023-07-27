import { ethers } from "ethers";
import { NetworkName } from "types/lib";
import { GetGasPriceResponse } from "types/lib/api/interfaces";
import RpcError from "types/lib/api/errors/rpc-error";
import * as RpcErrorCodes from "types/lib/api/errors/rpc-error-codes";
import { Logger, NetworkConfig } from "../interfaces";
import { getGasFee } from "../utils/getGasFee";

// custom features of Skandha
export class Skandha {
  constructor(
    private networkName: NetworkName,
    private provider: ethers.providers.JsonRpcProvider,
    private config: NetworkConfig,
    private logger: Logger
  ) {}

  async getGasPrice(): Promise<GetGasPriceResponse> {
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

    return {
      maxPriorityFeePerGas,
      maxFeePerGas,
    };
  }
}
