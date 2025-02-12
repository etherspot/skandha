import { providers } from "ethers";
import { Logger } from "@skandha/types/lib";
import { UserOperation } from "@skandha/types/lib/contracts/UserOperation";
import { NetworkConfig, UserOpValidationResult } from "../../../interfaces";
import { EntryPointService } from "../../EntryPointService";
import { TenderlyValidationService } from "./tenderly";

export class UnsafeValidationService {
  private tenderlyValidationService: TenderlyValidationService | null = null;
  constructor(
    private entryPointService: EntryPointService,
    private provider: providers.Provider,
    private networkConfig: NetworkConfig,
    private chainId: number,
    private logger: Logger
  ) {
    if (networkConfig.tenderlyKey && networkConfig.tenderlyApiUrl) {
      this.tenderlyValidationService = new TenderlyValidationService(
        entryPointService,
        networkConfig.tenderlyApiUrl,
        networkConfig.tenderlyKey,
        networkConfig.tenderlySave,
        chainId,
        logger
      );
    }
  }

  async validateUnsafely(
    userOp: UserOperation,
    entryPoint: string
  ): Promise<UserOpValidationResult> {
    if (this.tenderlyValidationService) {
      return await this.tenderlyValidationService.validate(userOp, entryPoint);
    }
    return await this.entryPointService.simulateValidation(entryPoint, userOp);
  }
}
