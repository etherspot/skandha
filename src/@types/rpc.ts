import { BigNumberish, BytesLike, providers } from 'ethers';
import { UserOperationStruct } from './erc4337';
import {
  IsEthereumAddress,
  IsNumber,
  IsString,
  ValidateNested
} from 'class-validator';

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
  @IsNumber()
  nonce!: BigNumberish;
  @IsString()
  initCode!: BytesLike;
  @IsString()
  callData!: BytesLike;
  @IsNumber()
  verificationGasLimit?: BigNumberish;
  @IsNumber()
  preVerificationGas?: BigNumberish;
  @IsNumber()
  maxFeePerGas?: BigNumberish;
  @IsNumber()
  maxPriorityFeePerGas?: BigNumberish;
  @IsString()
  paymasterAndData?: BytesLike;
  @IsString()
  signature!: BytesLike;
  @IsNumber()
  callGasLimit!: BigNumberish;
}

export class EstimateUserOperationGasArgs {
  @ValidateNested()
  userOp!: EstimateUserOperationStruct;

  @IsEthereumAddress()
  entryPoint!: string;
}
