import { Type } from "class-transformer";
import {
  IsArray,
  IsDefined,
  IsEthereumAddress,
  IsNumber,
  ValidateNested,
} from "class-validator";
import { ReputationStatus } from "@skandha/types/lib/executor";
import { Hex } from "viem";

export class SetReputationEntry {
  @IsEthereumAddress()
  address!: Hex;

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
  entryPoint!: Hex;
}

export type SetReputationResponse = Array<{
  address: string;
  opsSeen: number;
  opsIncluded: number;
  status: ReputationStatus;
}>;
