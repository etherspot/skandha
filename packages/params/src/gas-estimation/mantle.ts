import { UserOperation } from "@skandha/types/lib/contracts/UserOperation";
import { IPVGEstimator, IPVGEstimatorWrapper } from "../types/IPVGEstimator";
import { BigNumber, providers } from "ethers";
import mantleSDK from "@mantleio/sdk";

type BigNumberish = bigint | number | `0x${string}` | `${number}` | string;

export const estimateMantlePVG: IPVGEstimatorWrapper = (
  publicClient
): IPVGEstimator => {
  return async (
    contractAddr: string,
    data: string,
    initial: BigNumberish,
    options?: {
      contractCreation?: boolean;
      userOp?: UserOperation;
    }
  ): Promise<bigint> => {
    try {
      const provider = new providers.JsonRpcProvider(publicClient.transport.url)
      const mantleProvider = mantleSDK.asL2Provider(provider);
      const latestBlock = await provider.getBlock("latest");
      if (latestBlock.baseFeePerGas == null) {
        throw new Error("no base fee");
      }
      const l1GasCost = await mantleProvider.estimateL1GasCost({
        to: contractAddr,
        data: data,
      });
      const l2MaxFee = BigNumber.from(options!.userOp!.maxFeePerGas);
      const l2PriorityFee = latestBlock.baseFeePerGas.add(
        options!.userOp!.maxPriorityFeePerGas
      );
      const l2Price = l2MaxFee.lt(l2PriorityFee) ? l2MaxFee : l2PriorityFee;
      return l1GasCost.div(l2Price).add(initial).toBigInt();
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error("Error while estimating optimism PVG", err);
      return BigInt(initial);
    }
    return BigInt(initial);
  };
};
