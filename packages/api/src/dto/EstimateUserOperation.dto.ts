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

  @IsString()
  @IsCallData()
  @IsOptional()
  paymasterAndData?: BytesLike;
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
