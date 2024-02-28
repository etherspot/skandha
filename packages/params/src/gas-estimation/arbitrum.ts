import { NodeInterface__factory } from "@arbitrum/sdk/dist/lib/abi/factories/NodeInterface__factory";
import { NODE_INTERFACE_ADDRESS } from "@arbitrum/sdk/dist/lib/dataEntities/constants";
import { BigNumber, BigNumberish } from "ethers";
import { UserOperation } from "types/lib/contracts/UserOperation";
import { IPVGEstimator, IPVGEstimatorWrapper } from "../types/IPVGEstimator";

export const estimateArbitrumPVG: IPVGEstimatorWrapper = (
  provider
): IPVGEstimator => {
  const nodeInterface = NodeInterface__factory.connect(
    NODE_INTERFACE_ADDRESS,
    provider
  );
  return async (
    contractAddr: string,
    data: string,
    initial: BigNumberish,
    options?: {
      contractCreation?: boolean;
      userOp?: UserOperation;
    }
  ): Promise<BigNumber> => {
    try {
      const gasEstimateComponents =
        await nodeInterface.callStatic.gasEstimateL1Component(
          contractAddr,
          options!.contractCreation!,
          data
        );
      const l1GasEstimated = gasEstimateComponents.gasEstimateForL1;
      return l1GasEstimated.add(initial);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error("Error while estimating arbitrum PVG", err);
      return BigNumber.from(initial);
    }
  };
};
