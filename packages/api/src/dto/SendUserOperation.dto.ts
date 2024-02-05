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
   * EntryPoint v6 Properties
   */
  @ValidateIf((o) => o.paymasterAndData)
  @IsString()
  @IsCallData()
  initCode!: BytesLike;

  @ValidateIf((o) => o.paymasterAndData)
  @IsString()
  @IsCallData()
  paymasterAndData!: BytesLike;

  /**
   * EntryPoint v7 Properties
   */
  @ValidateIf((o) => o.paymasterData)
  @IsString()
  factory!: string;

  @ValidateIf((o) => o.paymasterData)
  @IsString()
  factoryData!: BytesLike;

  @ValidateIf((o) => o.paymasterData)
  @IsString()
  paymaster!: string;

  @ValidateIf((o) => o.paymasterData)
  @IsBigNumber()
  paymasterVerificationGasLimit!: BigNumberish;

  @ValidateIf((o) => o.paymasterData)
  @IsBigNumber()
  paymasterPostOpGasLimit!: BigNumberish;

  @ValidateIf((o) => o.paymasterData)
  @IsString()
  paymasterData!: BytesLike;
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
