import {
  IsArray,
  IsDefined,
  IsEthereumAddress,
  ValidateNested,
} from "class-validator";
import { SendUserOperationStruct } from "./SendUserOperation.dto";

export class SetMempoolArgs {
  @IsDefined()
  @IsArray()
  @ValidateNested()
  userOps!: SendUserOperationStruct[];

  @IsEthereumAddress()
  entryPoint!: string;
}
