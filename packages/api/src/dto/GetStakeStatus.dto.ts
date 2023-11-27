import { IsEthereumAddress } from "class-validator";

export class GetStakeStatusArgs {
  @IsEthereumAddress()
  address!: string;

  @IsEthereumAddress()
  entryPoint!: string;
}
