import { UserOperationStruct } from "types/lib/executor/contracts/EntryPoint";
import { BigNumber, BigNumberish, ethers } from "ethers";
import { EntryPoint__factory } from "types/lib/executor/contracts";
import { estimateL1Gas } from "@eth-optimism/sdk";
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
    const entryPoint = EntryPoint__factory.connect(entryPointAddr, provider);
    const handleOpsData = entryPoint.interface.encodeFunctionData("handleOps", [
      [userOp],
      dummyWallet.address,
    ]);

    try {
      const l1GasEstimated = await estimateL1Gas(provider, {
        to: entryPointAddr,
        data: handleOpsData,
      });
      return l1GasEstimated.add(initial);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error("Error while estimating optimism PVG", err);
      return BigNumber.from(initial);
    }
  };
};
