import {
  IsDefined,
  IsEthereumAddress,
  IsObject,
  IsOptional,
  IsString,
  ValidateNested
} from "class-validator";
import { Hex } from "viem";
import { IsBigNumberish } from "../utils/index.js";
import { Type } from "class-transformer";

type BigNumberish = bigint | number | `0x${string}` | `${number}`;

export class PaymasterContext {
  @IsEthereumAddress()
  token!: Hex;
}

export class SponsorUserOperation {
  /**
   * Common Properties
   */
  @IsEthereumAddress()
  sender!: Hex;

  @IsBigNumberish()
  nonce!: BigNumberish;

  @IsString()
  callData!: Hex;

  @IsString()
  signature!: Hex;

  /**
   * EntryPoint v7 Properties
   */
  @IsOptional()
  factory?: Hex;

  @IsString()
  @IsOptional()
  factoryData?: Hex;
}

export class SponsorUserOperationArgs {
  @IsDefined()
  @IsObject()
  @ValidateNested()
  @Type(() => SponsorUserOperation)
  userOp!: SponsorUserOperation;

  @IsEthereumAddress()
  entryPoint!: string;

  @IsDefined()
  @IsObject()
  @ValidateNested()
  @Type(() => PaymasterContext)
  context!: PaymasterContext
}
