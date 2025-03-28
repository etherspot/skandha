import { NodeInterface__factory } from "@arbitrum/sdk/dist/lib/abi/factories/NodeInterface__factory";
import { NODE_INTERFACE_ADDRESS } from "@arbitrum/sdk/dist/lib/dataEntities/constants";
import { UserOperation } from "@skandha/types/lib/contracts/UserOperation";
import { IPVGEstimator, IPVGEstimatorWrapper } from "../types/IPVGEstimator";
import { getContract } from "viem";

type BigNumberish = bigint | number | `0x${string}` | `${number}` | string;

export const estimateArbitrumPVG: IPVGEstimatorWrapper = (
  publicClient
): IPVGEstimator => {
  const nodeInterface = getContract({
    abi: NodeInterface__factory.abi,
    address: NODE_INTERFACE_ADDRESS,
    client: publicClient
  });
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
      const gasEstimateComponents: any =
        await nodeInterface.read.gasEstimateL1Component([contractAddr, options?.contractCreation, data])
      const l1GasEstimated = gasEstimateComponents.gasEstimateForL1;
      return l1GasEstimated + BigInt(initial);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error("Error while estimating arbitrum PVG", err);
      return BigInt(initial);
    }
  };
};
