import { IsEthereumAddress } from "class-validator";
import { Hex } from "viem";

export class GetStakeStatusArgs {
  @IsEthereumAddress()
  address!: Hex;

  @IsEthereumAddress()
  entryPoint!: Hex;
}
