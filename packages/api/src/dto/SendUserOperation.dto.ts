import {
  IsDefined,
  IsEthereumAddress,
  IsObject,
  IsString,
  ValidateNested,
} from "class-validator";
import { BigNumberish, BytesLike } from "ethers";
import { Type } from "class-transformer";
import { IsBigNumber, IsCallData } from "../utils";

export class SendUserOperationStruct {
  @IsEthereumAddress()
  sender!: string;
  @IsBigNumber()
  nonce!: BigNumberish;
  @IsString()
  @IsCallData()
  initCode!: BytesLike;
  @IsString()
  callData!: BytesLike;
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
  @IsString()
  signature!: BytesLike;
  @IsBigNumber()
  callGasLimit!: BigNumberish;
}

export class SendUserOperationGasArgs {
  @IsDefined()
  @IsObject()
  @ValidateNested()
  @Type(() => SendUserOperationStruct)
  userOp!: SendUserOperationStruct;

  @IsEthereumAddress()
  entryPoint!: string;
}
