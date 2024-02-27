import { UserOperation } from "types/src/contracts/UserOperation";
import { EstimatedUserOperationGas } from "types/src/api/interfaces";

export function applyEstimatedUserOp(userOp: UserOperation, estimated: EstimatedUserOperationGas) {
  userOp.maxFeePerGas = estimated.maxFeePerGas;
  userOp.maxPriorityFeePerGas = estimated.maxPriorityFeePerGas;
  userOp.preVerificationGas = estimated.preVerificationGas;
  userOp.verificationGasLimit = estimated.verificationGasLimit;
  userOp.callGasLimit = estimated.callGasLimit;
  return userOp;
}
