import {
  IsDefined,
  IsEthereumAddress,
  IsObject,
  IsOptional,
  IsString,
  ValidateNested,
} from "class-validator";
import { Type } from "class-transformer";
import { Address, Hex } from "viem";
import { IsBigNumberish } from "../utils/index.js";
import { IsValidFactory } from "../utils/isValidFactory.js";

type BigNumberish = bigint | number | `0x${string}` | `${number}`;

export class EstimateUserOperation {
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
  @IsValidFactory()
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
}

export class StateOverridesOptions {
  @IsBigNumberish()
  @IsOptional()
  balance?: BigNumberish;

  @IsBigNumberish()
  @IsOptional()
  nonce?: BigNumberish;

  @IsString()
  @IsOptional()
  code?: Hex;

  @IsOptional()
  state?: Record<Hex, Hex>;

  @IsOptional()
  stateDiff?: Record<Hex, Hex>;
}

export class EstimateUserOperationGasArgs {
  @IsDefined()
  @IsObject()
  @ValidateNested()
  @Type(() => EstimateUserOperation)
  userOp!: EstimateUserOperation;

  @IsEthereumAddress()
  entryPoint!: Hex;

  @ValidateNested()
  @IsOptional()
  stateOverrides?: Record<Address, StateOverridesOptions>;
}
