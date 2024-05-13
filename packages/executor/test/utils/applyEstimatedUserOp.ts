import { EstimatedUserOperationGas } from "@skandha/types/src/api/interfaces";
import { UserOperationStruct } from "@skandha/types/src/executor/contracts/EntryPoint";

export function applyEstimatedUserOp(userOp: UserOperationStruct, estimated: EstimatedUserOperationGas) {
  userOp.maxFeePerGas = estimated.maxFeePerGas;
  userOp.maxPriorityFeePerGas = estimated.maxPriorityFeePerGas;
  userOp.preVerificationGas = estimated.preVerificationGas;
  userOp.verificationGasLimit = estimated.verificationGasLimit;
  userOp.callGasLimit = estimated.callGasLimit;
  return userOp;
}
