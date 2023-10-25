import { UserOperationStruct } from "types/lib/executor/contracts/EntryPoint";
import { BigNumber, BigNumberish, ethers } from "ethers";
import { IEntryPoint__factory } from "types/lib/executor/contracts";
import { estimateL1GasCost } from "@eth-optimism/sdk";
import { IPVGEstimator, IPVGEstimatorWrapper } from "../types/IPVGEstimator";

export const estimateOptimismPVG: IPVGEstimatorWrapper = (
  provider
): IPVGEstimator => {
  const dummyWallet = ethers.Wallet.createRandom();
  return async (
    entryPointAddr: string,
    userOp: UserOperationStruct,
    initial: BigNumberish
  ): Promise<BigNumber> => {
    const entryPoint = IEntryPoint__factory.connect(entryPointAddr, provider);
    const handleOpsData = entryPoint.interface.encodeFunctionData("handleOps", [
      [userOp],
      dummyWallet.address,
    ]);

    try {
      const latestBlock = await provider.getBlock("latest");
      if (latestBlock.baseFeePerGas == null) {
        throw new Error("no base fee");
      }
      const l1GasCost = await estimateL1GasCost(provider, {
        to: entryPointAddr,
        data: handleOpsData,
      });
      const l2MaxFee = BigNumber.from(userOp.maxFeePerGas);
      const l2PriorityFee = latestBlock.baseFeePerGas.add(
        userOp.maxPriorityFeePerGas
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
