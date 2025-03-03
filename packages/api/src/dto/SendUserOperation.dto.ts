import {
  IsDefined,
  IsEthereumAddress,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  ValidateNested,
} from "class-validator";
import { BigNumberish, BytesLike } from "ethers";
import { Type } from "class-transformer";
import { IsBigNumber } from "../utils/isBigNumber";

export class Eip7702Auth {
  @IsBigNumber()
  chainId!: BigNumberish;
  @IsBigNumber()
  nonce!: BigNumberish;
  @IsEthereumAddress()
  address!: string;
  @IsString()
  r!: string;
  @IsString()
  s!: string;
  yParity!: "0x0" | "0x1";
}

export class SendUserOperation {
  /**
   * Common Properties
   */
  @IsEthereumAddress()
  sender!: string;
  @IsBigNumber()
  nonce!: BigNumberish;
  @IsBigNumber()
  callGasLimit!: BigNumberish;
  @IsBigNumber()
  verificationGasLimit!: BigNumberish;
  @IsBigNumber()
  preVerificationGas!: BigNumberish;
  @IsBigNumber()
  maxFeePerGas!: BigNumberish;
  @IsBigNumber()
  maxPriorityFeePerGas!: BigNumberish;
  @IsString()
  callData!: BytesLike;
  @IsString()
  signature!: BytesLike;

  /**
   * EntryPoint v7 Properties
   */
  @IsEthereumAddress()
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

  /**
   * Eip-7702 property
   */
  @IsOptional()
  @ValidateNested()
  @Type(() => Eip7702Auth)
  eip7702Auth?: Eip7702Auth;
}

export class SendUserOperationGasArgs {
  @IsDefined()
  @IsObject()
  @ValidateNested()
  @Type(() => SendUserOperation)
  userOp!: SendUserOperation;

  @IsEthereumAddress()
  entryPoint!: string;
}
