import {
  IsDefined,
  IsEthereumAddress,
  IsObject,
  IsOptional,
  IsString,
  ValidateNested,
} from "class-validator";
import { BigNumberish, BytesLike } from "ethers";
import { Type } from "class-transformer";
import { IsBigNumber, IsValidFactory } from "../utils";

export class EstimateUserOperation {
  /**
   * Common Properties
   */
  @IsEthereumAddress()
  sender!: string;

  @IsBigNumber()
  nonce!: BigNumberish;

  @IsString()
  callData!: BytesLike;

  @IsString()
  signature!: BytesLike;

  /**
   * EntryPoint v7 Properties
   */
  @IsValidFactory()
  @IsOptional()
  factory?: string;

  @IsString()
  @IsOptional()
  factoryData?: BytesLike;

  @IsEthereumAddress()
  @IsOptional()
  paymaster?: string;

  @IsBigNumber()
  @IsOptional()
  paymasterVerificationGasLimit?: BigNumberish;

  @IsBigNumber()
  @IsOptional()
  paymasterPostOpGasLimit?: BigNumberish;

  @IsString()
  @IsOptional()
  paymasterData?: BytesLike;
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
