import { Type } from "class-transformer";
import {
  IsArray,
  IsDefined,
  IsEthereumAddress,
  IsNumber,
  ValidateNested,
} from "class-validator";
import { ReputationStatus } from "types/lib/executor";

export class SetReputationEntry {
  @IsEthereumAddress()
  address!: string;

  @IsNumber()
  opsSeen!: number;

  @IsNumber()
  opsIncluded!: number;
}

export class SetReputationArgs {
  @IsDefined()
  @IsArray()
  @ValidateNested()
  @Type(() => SetReputationEntry)
  reputations!: SetReputationEntry[];

  @IsEthereumAddress()
  entryPoint!: string;
}

export type SetReputationResponse = Array<{
  address: string;
  opsSeen: number;
  opsIncluded: number;
  status: ReputationStatus;
}>;
