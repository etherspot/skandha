import { BigNumber, BigNumberish, providers } from "ethers";
import { UserOperation } from "types/lib/contracts/UserOperation";

export type IPVGEstimatorWrapper = (
  provider: providers.StaticJsonRpcProvider
) => IPVGEstimator;

export type IPVGEstimator = (
  contractAddr: string,
  data: string,
  initial: BigNumberish, // initial amount of gas. It will be added to the estimated gas
  options?: {
    contractCreation?: boolean;
    userOp?: UserOperation;
  }
) => Promise<BigNumber>;
