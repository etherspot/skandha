import { BigNumber } from "ethers";
import { MempoolEntry } from "../../../entities/MempoolEntry";

export function estimateBundleGasLimit(
  markup: number,
  bundle: MempoolEntry[]
): BigNumber {
  let gasLimit = BigNumber.from(markup);
  for (const { userOp } of bundle) {
    gasLimit = BigNumber.from(userOp.verificationGasLimit)
      .mul(3)
      .add(userOp.preVerificationGas)
      .add(userOp.callGasLimit)
      .mul(11)
      .div(10)
      .add(gasLimit);
  }
  if (gasLimit.lt(1e5)) {
    // gasLimit should at least be 1e5 to pass test in test-executor
    gasLimit = BigNumber.from(1e5);
  }
  return gasLimit;
}
