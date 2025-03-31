import { IsEthereumAddress, ValidateIf } from "class-validator";
import { Hex } from "viem";
import { IsBigNumberish } from "../utils";

type BigNumberish = bigint | number | `0x${string}` | `${number}`;

export class FeeHistoryArgs {
  @IsEthereumAddress()
  entryPoint!: Hex;

  @IsBigNumberish()
  blockCount!: BigNumberish;

  @ValidateIf((o) => o.newestBlock != "latest")
  @IsBigNumberish()
  newestBlock!: BigNumberish | string;
}
