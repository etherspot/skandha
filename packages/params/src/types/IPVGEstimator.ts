import { BigNumber, BigNumberish, providers } from "ethers";
import { UserOperationStruct } from "types/lib/executor/contracts/EntryPoint";

export type IPVGEstimatorWrapper = (
  provider: providers.StaticJsonRpcProvider
) => IPVGEstimator;

export type IPVGEstimator = (
  entryPointAddr: string,
  userOp: UserOperationStruct,
  initial: BigNumberish // initial amount of gas. It will be added to the estimated gas
) => Promise<BigNumber>;
