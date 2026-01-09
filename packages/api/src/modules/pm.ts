import { Pm } from "@skandha/executor/lib/modules/pm";
import { RpcMethodValidator } from "../utils/RpcMethodValidator";
import { GetpaymasterStubDataArgs } from "../dto/GetPaymasterStubData.dto";
import { GetpaymasterDataArgs } from "../dto/GetPaymasterData.dto";

export class PmAPI {
  constructor(private pmModule: Pm) {}

  @RpcMethodValidator(GetpaymasterStubDataArgs)
  async getpaymasterStubData(args: GetpaymasterStubDataArgs) {
    return await this.pmModule.getPaymasterStubData(args)
  }

  @RpcMethodValidator(GetpaymasterDataArgs)
  async getPaymasterData(args: GetpaymasterDataArgs) {
    return await this.pmModule.getPaymasterData(args);
  }
}
