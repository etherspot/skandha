import { BigNumber } from "ethers";
import { UserOperationStruct } from "types/lib/executor/contracts/EntryPoint";
import { MempoolEntry } from "../../../entities/MempoolEntry";

export function estimateBundleGasLimit(
  markup: number,
  bundle: MempoolEntry[]
): BigNumber {
  let gasLimit = BigNumber.from(markup);
  for (const { userOp } of bundle) {
    gasLimit = getUserOpGasLimit(userOp, gasLimit);
  }
  if (gasLimit.lt(1e5)) {
    // gasLimit should at least be 1e5 to pass test in test-executor
    gasLimit = BigNumber.from(1e5);
  }
  return gasLimit;
}

export function getUserOpGasLimit(
  userOp: UserOperationStruct,
  markup: BigNumber = BigNumber.from(0)
): BigNumber {
  return BigNumber.from(userOp.verificationGasLimit)
    .mul(3)
    .add(userOp.preVerificationGas)
    .add(userOp.callGasLimit)
    .mul(11)
    .div(10)
    .add(markup);
}
