import { UserOperation } from "@skandha/types/lib/contracts/UserOperation";
import { MempoolEntry } from "../../../entities/MempoolEntry";

type BigNumberish = bigint | number | `0x${string}` | `${number}` | string;

export function estimateBundleGasLimit(
  markup: number,
  bundle: MempoolEntry[],
  estimationGasLimit: BigNumberish = 0
): bigint {
  let gasLimit = BigInt(markup);
  for (const { userOp } of bundle) {
    gasLimit = getUserOpGasLimit(userOp, gasLimit);
  }
  if (gasLimit < BigInt(1e5)) {
    // gasLimit should at least be 1e5 to pass test in test-executor
    gasLimit = BigInt(1e5);
  }
  return gasLimit > BigInt(estimationGasLimit)
    ? gasLimit
    : BigInt(estimationGasLimit);
}

export function getUserOpGasLimit(
  userOp: UserOperation,
  markup: bigint = BigInt(0),
  estimationGasLimit: BigNumberish = 0
): bigint {
  const scwGasLimit = (
    (
      (
        (BigInt(userOp.verificationGasLimit) * BigInt(3)) + BigInt(200000) + BigInt(userOp.callGasLimit)
      ) * BigInt(11)
    ) / BigInt(10)
  ) + BigInt(markup)
  const pmGasLimit =
    userOp.paymasterVerificationGasLimit == null
      ? BigInt(0)
      : BigInt(userOp.paymasterVerificationGasLimit) + BigInt(userOp.paymasterPostOpGasLimit ?? 0);
  const gasLimit = scwGasLimit + pmGasLimit;

  return gasLimit > BigInt(estimationGasLimit)
    ? gasLimit
    : BigInt(estimationGasLimit);
}
