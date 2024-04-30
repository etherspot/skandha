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
import { IsBigNumber, IsCallData } from "../utils";

export class EstimateUserOperationStruct {
  @IsEthereumAddress()
  sender!: string;
  @IsBigNumber()
  nonce!: BigNumberish;
  @IsString()
  @IsCallData()
  initCode!: BytesLike;
  @IsString()
  callData!: BytesLike;
  @IsString()
  signature!: BytesLike;

  @IsBigNumber()
  @IsOptional()
  verificationGasLimit?: BigNumberish;

  @IsBigNumber()
  @IsOptional()
  preVerificationGas?: BigNumberish;

  @IsBigNumber()
  @IsOptional()
  maxFeePerGas?: BigNumberish;

  @IsBigNumber()
  @IsOptional()
  maxPriorityFeePerGas?: BigNumberish;

  @IsString()
  @IsCallData()
  @IsOptional()
  paymasterAndData?: BytesLike;

  @IsBigNumber()
  @IsOptional()
  callGasLimit?: BigNumberish;
}

export class EstimateUserOperationGasArgs {
  @IsDefined()
  @IsObject()
  @ValidateNested()
  @Type(() => EstimateUserOperationStruct)
  userOp!: EstimateUserOperationStruct;

  @IsEthereumAddress()
  entryPoint!: string;
}
