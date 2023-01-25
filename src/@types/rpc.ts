import { BigNumberish, BytesLike, providers } from 'ethers';
import { UserOperationStruct } from './erc4337';
import {
  IsDefined,
  IsEthereumAddress,
  IsNumber,
  IsObject,
  IsString,
  MinLength,
  ValidateNested
} from 'class-validator';
import { Type } from 'class-transformer';
import { IsBigNumber } from 'app/lib/is-bignumber';
import { IsCallData } from 'app/bundler/rpc/decorators';

export type SupportedEntryPoints = string[];

export type EthChainIdResponse = { chainId: number };

export type EstimatedUserOperationGas = {
  preVerificationGas: BigNumberish,
  verificationGasLimit: BigNumberish,
  callGasLimit: BigNumberish,
}

export type UserOperationByHashResponse = {
  userOperation: UserOperationStruct
  entryPoint: string
  blockNumber: number
  blockHash: string
  transactionHash: string
}

export type UserOperationReceipt = {
  userOpHash: string
  sender: string
  nonce: BigNumberish
  paymaster?: string
  actualGasCost: BigNumberish
  actualGasUsed: BigNumberish
  success: boolean
  reason?: string
  logs: any[]
  receipt: providers.TransactionReceipt
}

export class EstimateUserOperationStruct {
  @IsEthereumAddress()
  sender!: string;
  @IsBigNumber()
  nonce!: BigNumberish;
  @IsString()
  @IsCallData()
  initCode!: BytesLike;
  @IsString()
  @IsCallData()
  callData!: BytesLike;
  @IsBigNumber()
  verificationGasLimit?: BigNumberish;
  @IsBigNumber()
  preVerificationGas?: BigNumberish;
  @IsBigNumber()
  maxFeePerGas?: BigNumberish;
  @IsBigNumber()
  maxPriorityFeePerGas?: BigNumberish;
  @IsString()
  @IsCallData()
  paymasterAndData?: BytesLike;
  @IsString()
  signature!: BytesLike;
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
