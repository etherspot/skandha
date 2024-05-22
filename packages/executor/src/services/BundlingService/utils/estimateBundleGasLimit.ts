import { BigNumber, BigNumberish } from "ethers";
import { UserOperationStruct } from "@skandha/types/lib/executor/contracts/EntryPoint";
import { MempoolEntry } from "../../../entities/MempoolEntry";

export function estimateBundleGasLimit(
  markup: number,
  bundle: MempoolEntry[],
  estimationGasLimit: BigNumberish = 0
): BigNumber {
  let gasLimit = BigNumber.from(markup);
  for (const { userOp } of bundle) {
    gasLimit = getUserOpGasLimit(userOp, gasLimit, 0);
  }
  if (gasLimit.lt(1e5)) {
    // gasLimit should at least be 1e5 to pass test in test-executor
    gasLimit = BigNumber.from(1e5);
  }
  return gasLimit.gt(estimationGasLimit)
    ? gasLimit
    : BigNumber.from(estimationGasLimit);
}

export function getUserOpGasLimit(
  userOp: UserOperationStruct,
  markup: BigNumber = BigNumber.from(0),
  estimationGasLimit: BigNumberish = 0
): BigNumber {
  const gasLimit = BigNumber.from(userOp.verificationGasLimit)
    .mul(3)
    .add(200000) // instead of PVG
    .add(userOp.callGasLimit)
    .mul(11)
    .div(10)
    .add(markup);

  return gasLimit.gt(estimationGasLimit)
    ? gasLimit
    : BigNumber.from(estimationGasLimit);
}
