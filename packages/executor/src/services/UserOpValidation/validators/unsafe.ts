import { providers } from "ethers";
import { Logger } from "types/lib";
import { UserOperation6And7 } from "types/lib/contracts/UserOperation";
import { NetworkConfig, UserOpValidationResult } from "../../../interfaces";
import { parseErrorResult } from "../utils";
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
    const errorResult = await this.entryPointService.simulateValidation(
      entryPoint,
      userOp
    );
    return parseErrorResult(userOp, errorResult);
  }
}
