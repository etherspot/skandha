import { IsEthereumAddress } from "class-validator";

export class DumpReputationArgs {
  @IsEthereumAddress()
  entryPoint!: string;
}
