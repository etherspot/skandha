import {
  IsDefined,
  IsEthereumAddress,
  IsObject,
  IsOptional,
  IsString,
  ValidateNested,
} from "class-validator";
import { Type } from "class-transformer";
import { Hex } from "viem";
import { IsBigNumberish } from "../utils/isBigNumber";

type BigNumberish = bigint | number | `0x${string}` | `${number}`;

export class Eip7702Auth {
  @IsBigNumberish()
  chainId!: BigNumberish;
  @IsBigNumberish()
  nonce!: BigNumberish;
  @IsEthereumAddress()
  address!: Hex;
  @IsString()
  r!: Hex;
  @IsString()
  s!: Hex;
  yParity!: "0x0" | "0x1";
}

export class SendUserOperation {
  /**
   * Common Properties
   */
  @IsEthereumAddress()
  sender!: Hex;
  @IsBigNumberish()
  nonce!: BigNumberish;
  @IsBigNumberish()
  callGasLimit!: BigNumberish;
  @IsBigNumberish()
  verificationGasLimit!: BigNumberish;
  @IsBigNumberish()
  preVerificationGas!: BigNumberish;
  @IsBigNumberish()
  maxFeePerGas!: BigNumberish;
  @IsBigNumberish()
  maxPriorityFeePerGas!: BigNumberish;
  @IsString()
  callData!: Hex;
  @IsString()
  signature!: Hex;

  /**
   * EntryPoint v7 Properties
   */
  @IsEthereumAddress()
  @IsOptional()
  factory?: Hex;

  @IsString()
  @IsOptional()
  factoryData?: Hex;

  @IsEthereumAddress()
  @IsOptional()
  paymaster?: Hex;

  @IsBigNumberish()
  @IsOptional()
  paymasterVerificationGasLimit?: BigNumberish;

  @IsBigNumberish()
  @IsOptional()
  paymasterPostOpGasLimit?: BigNumberish;

  @IsString()
  @IsOptional()
  paymasterData?: Hex;

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
