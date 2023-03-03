import { IsNumber } from "class-validator";

export class SetBundlingIntervalArgs {
  @IsNumber()
  interval!: number;
}
