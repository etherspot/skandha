import {
  IsDefined,
  IsEthereumAddress,
  IsObject,
  ValidateNested,
} from "class-validator";
import { Type } from "class-transformer";
import { SendUserOperationStruct } from "./SendUserOperation.dto";

export class SetMempoolArgs {
  @IsDefined()
  @IsObject()
  @ValidateNested()
  @Type(() => SendUserOperationStruct)
  userOps!: SendUserOperationStruct[];

  @IsEthereumAddress()
  entryPoint!: string;
}
