import { Type } from "class-transformer";
import {
  IsArray,
  IsDefined,
  IsEnum,
  IsEthereumAddress,
  IsNumber,
  IsOptional,
  ValidateNested,
} from "class-validator";
import { ReputationStatus } from "types/lib/relayer";

export class SetReputationEntry {
  @IsEthereumAddress()
  address!: string;

  @IsNumber()
  opsSeen!: number;

  @IsNumber()
  opsIncluded!: number;

  @IsEnum(ReputationStatus)
  @IsOptional()
  status?: ReputationStatus;
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
  status: string;
}>;
