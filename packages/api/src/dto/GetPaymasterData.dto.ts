import { Type } from "class-transformer";
import { IsDefined, IsEthereumAddress, IsObject, IsString, ValidateNested } from "class-validator";
import { PaymasterContext, SponsorEstimatedUserOperationArgs } from "./SponsorUserOperation";

export class GetpaymasterDataArgs {
  @IsDefined()
  @IsObject()
  @ValidateNested()
  @Type(() => SponsorEstimatedUserOperationArgs)
  userOp!: SponsorEstimatedUserOperationArgs;

  @IsEthereumAddress()
  entryPoint!: string;

  @IsString()
  chainId!: string;

  @IsDefined()
  @IsObject()
  @ValidateNested()
  @Type(() => PaymasterContext)
  context!: PaymasterContext
}
