import { BigNumber, BigNumberish } from "ethers";
import mantleSDK from "@mantleio/sdk";
import { UserOperation6And7 } from "types/lib/contracts/UserOperation";
import { IPVGEstimator, IPVGEstimatorWrapper } from "../types/IPVGEstimator";

export const estimateMantlePVG: IPVGEstimatorWrapper = (
  provider
): IPVGEstimator => {
  return async (
    contractAddr: string,
    data: string,
    initial: BigNumberish,
    options?: {
      contractCreation?: boolean;
      userOp?: UserOperation6And7;
    }
  ): Promise<BigNumber> => {
    try {
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
      return l1GasCost.div(l2Price).add(initial);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error("Error while estimating optimism PVG", err);
      return BigNumber.from(initial);
    }
  };
};
