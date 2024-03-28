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
import { IsBigNumber } from "../utils/is-bignumber";
import { IsCallData } from "../utils/IsCallCode";

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
  verificationGasLimit!: BigNumberish;

  @IsBigNumber()
  preVerificationGas!: BigNumberish;

  @IsBigNumber()
  maxFeePerGas!: BigNumberish;

  @IsBigNumber()
  maxPriorityFeePerGas!: BigNumberish;

  @IsString()
  @IsCallData()
  paymasterAndData!: BytesLike;

  @IsBigNumber()
  callGasLimit!: BigNumberish;
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
