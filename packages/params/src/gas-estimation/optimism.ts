import { UserOperationStruct } from "types/lib/executor/contracts/EntryPoint";
import { BigNumber, BigNumberish, ethers } from "ethers";
import { EntryPoint__factory } from "types/lib/executor/contracts";
import { estimateL1Gas, getL1GasPrice } from "@eth-optimism/sdk";
import { IPVGEstimator, IPVGEstimatorWrapper } from "../types/IPVGEstimator";
import { IGetL1GasPrice, IGetL1GasPriceWrapper } from "../types/IGetL1Cost";

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

export const getOptimismL1Cost: IGetL1GasPriceWrapper = (
  provider
): IGetL1GasPrice => {
  return async (): Promise<BigNumber> => {
    return await getL1GasPrice(provider);
  };
};
