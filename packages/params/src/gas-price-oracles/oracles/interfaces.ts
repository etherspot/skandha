import { PublicClient } from "viem";
import { UserOperation } from "@skandha/types/lib/contracts/UserOperation";

type BigNumberish = bigint | number | `0x${string}` | `${number}`;

export type IGetGasFeeResult = {
  maxPriorityFeePerGas: BigNumberish | undefined;
  maxFeePerGas: BigNumberish | undefined;
  gasPrice: BigNumberish | undefined;
};

export type IOracle = (
  apiKey: string,
  publicClient?: PublicClient,
  options?: IOracleOptions
) => Promise<IGetGasFeeResult>;

export type IOracleOptions = {
  entryPoint: string;
  userOp: UserOperation;
};
