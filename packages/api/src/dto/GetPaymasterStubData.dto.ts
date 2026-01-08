import { Type } from "class-transformer";
import { IsDefined, IsEthereumAddress, IsObject, IsString, ValidateNested } from "class-validator";
import { PaymasterContext, SponsorUserOperation } from "./SponsorUserOperation";

export class GetpaymasterStubDataArgs {
  @IsDefined()
  @IsObject()
  @ValidateNested()
  @Type(() => SponsorUserOperation)
  userOp!: SponsorUserOperation;

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
