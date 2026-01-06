import { Address, Hex } from "viem";
import { UserOperation } from "@skandha/types/lib/contracts/UserOperation";

export interface IPaymasterService {
  getHash(
    userOp: UserOperation,
    validUntil: number,
    validAfter: number,
    token: Address,
    ethPrice: bigint,
    tokenPrice: bigint
  ): Promise<Hex>;

  getPaymasterData(
    userOp: UserOperation,
    validUntil: number,
    validAfter: number,
    token: Address
  ): Promise<Hex>;

  getPaymasterDataForEstimation(
    validUntil: number,
    validAfter: number,
    token: Address
  ): Hex;

  packPaymasterData(
    paymaster: Address,
    paymasterVerificationGasLimit: bigint,
    postOpGasLimit: bigint,
    paymasterData?: Hex
  ): Hex
}
