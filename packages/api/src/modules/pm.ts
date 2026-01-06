import { Pm } from "@skandha/executor/lib/modules/pm";
import { RpcMethodValidator } from "../utils/RpcMethodValidator";
import { SponsorUserOperationArgs } from "../dto/SponsorUserOperation";

export class PmAPI {
  constructor(private pmModule: Pm) {}

  @RpcMethodValidator(SponsorUserOperationArgs)
  async sponsorUserOperation(args: SponsorUserOperationArgs) {
    return await this.pmModule.sponsorUserOperation(args);
  }
}
