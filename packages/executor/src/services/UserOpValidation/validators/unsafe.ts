import { providers } from "ethers";
import { Logger } from "types/lib";
import { UserOperation6And7 } from "types/lib/contracts/UserOperation";
import { NetworkConfig, UserOpValidationResult } from "../../../interfaces";
import { EntryPointService } from "../../EntryPointService";

export class UnsafeValidationService {
  constructor(
    private entryPointService: EntryPointService,
    private provider: providers.Provider,
    private networkConfig: NetworkConfig,
    private logger: Logger
  ) {}

  async validateUnsafely(
    userOp: UserOperation6And7,
    entryPoint: string
  ): Promise<UserOpValidationResult> {
    return await this.entryPointService.simulateValidation(entryPoint, userOp);
  }
}
