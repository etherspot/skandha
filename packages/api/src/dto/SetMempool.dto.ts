import {
  IsArray,
  IsDefined,
  IsEthereumAddress,
  ValidateNested,
} from "class-validator";
import { SendUserOperation } from "./SendUserOperation.dto";

export class SetMempoolArgs {
  @IsDefined()
  @IsArray()
  @ValidateNested()
  userOps!: SendUserOperation[];

  @IsEthereumAddress()
  entryPoint!: string;
}
