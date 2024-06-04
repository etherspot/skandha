import { BigNumber, BigNumberish } from "ethers";
import { UserOperation } from "@skandha/types/lib/contracts/UserOperation";
import { MempoolEntry } from "../../../entities/MempoolEntry";

export function estimateBundleGasLimit(
  markup: number,
  bundle: MempoolEntry[],
  estimationGasLimit: BigNumberish = 0
): BigNumber {
  let gasLimit = BigNumber.from(markup);
  for (const { userOp } of bundle) {
    gasLimit = getUserOpGasLimit(userOp, gasLimit);
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
  userOp: UserOperation,
  markup: BigNumber = BigNumber.from(0),
  estimationGasLimit: BigNumberish = 0
): BigNumber {
  const scwGasLimit = BigNumber.from(userOp.verificationGasLimit)
    .mul(3)
    .add(200000) // instead of PVG
    .add(userOp.callGasLimit)
    .mul(11)
    .div(10)
    .add(markup);
  const pmGasLimit =
    userOp.paymasterVerificationGasLimit != null
      ? BigNumber.from(0)
      : BigNumber.from(userOp.paymasterVerificationGasLimit).add(
          userOp.paymasterPostOpGasLimit ?? 0
        );
  const gasLimit = scwGasLimit.add(pmGasLimit);

  return gasLimit.gt(estimationGasLimit)
    ? gasLimit
    : BigNumber.from(estimationGasLimit);
}
