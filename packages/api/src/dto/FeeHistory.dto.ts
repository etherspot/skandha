import { IsEthereumAddress, ValidateIf } from "class-validator";
import { BigNumberish } from "ethers";
import { IsBigNumber } from "../utils";

export class FeeHistoryArgs {
  @IsEthereumAddress()
  entryPoint!: string;

  @IsBigNumber()
  blockCount!: BigNumberish;

  @ValidateIf((o) => o.newestBlock != "latest")
  @IsBigNumber()
  newestBlock!: BigNumberish | string;
}
