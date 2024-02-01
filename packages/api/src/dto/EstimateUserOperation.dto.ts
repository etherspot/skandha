import {
  IsDefined,
  IsEthereumAddress,
  IsObject,
  IsString,
  ValidateIf,
  ValidateNested,
} from "class-validator";
import { BigNumberish, BytesLike } from "ethers";
import { Type } from "class-transformer";
import { IsBigNumber } from "../utils/is-bignumber";
import { IsCallData } from "../utils/IsCallCode";

export class EstimateUserOperation {
  /**
   * Common Properties
   */
  @IsEthereumAddress()
  sender!: string;
  @IsBigNumber()
  nonce!: BigNumberish;
  @IsBigNumber()
  callGasLimit?: BigNumberish;
  @IsBigNumber()
  verificationGasLimit?: BigNumberish;
  @IsBigNumber()
  preVerificationGas?: BigNumberish;
  @IsBigNumber()
  maxFeePerGas?: BigNumberish;
  @IsBigNumber()
  maxPriorityFeePerGas?: BigNumberish;
  @IsString()
  callData!: BytesLike;
  @IsString()
  signature!: BytesLike;

  /**
   * EntryPoint v6 Properties
   */
  @ValidateIf((o) => o.paymasterData)
  @IsString()
  @IsCallData()
  initCode!: BytesLike;

  @ValidateIf((o) => o.paymasterData)
  @IsString()
  @IsCallData()
  paymasterAndData!: BytesLike;

  /**
   * EntryPoint v7 Properties
   */
  /**
   * EntryPoint v7 Properties
   */
  @ValidateIf((o) => o.paymasterAndData)
  @IsString()
  factory!: string;

  @ValidateIf((o) => o.paymasterAndData)
  @IsCallData()
  @IsString()
  factoryData!: BytesLike;

  @ValidateIf((o) => o.paymasterAndData)
  @IsString()
  paymaster!: string;

  @ValidateIf((o) => o.paymasterAndData)
  @IsBigNumber()
  paymasterVerificationGasLimit!: BigNumberish;

  @ValidateIf((o) => o.paymasterAndData)
  @IsBigNumber()
  paymasterPostOpGasLimit!: BigNumberish;

  @ValidateIf((o) => o.paymasterAndData)
  @IsCallData()
  @IsString()
  paymasterData!: BytesLike;
}

export class EstimateUserOperationGasArgs {
  @IsDefined()
  @IsObject()
  @ValidateNested()
  @Type(() => EstimateUserOperation)
  userOp!: EstimateUserOperation;

  @IsEthereumAddress()
  entryPoint!: string;
}
