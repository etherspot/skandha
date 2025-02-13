import { UserOperation } from "@skandha/types/lib/contracts/UserOperation";
import axios from "axios";
import { Logger } from "@skandha/types/lib";
import { constants } from "ethers";
import { EntryPointService } from "../../EntryPointService";

export class TenderlyValidationService {
  constructor(
    private entryPointService: EntryPointService,
    private tenderlyApiUrl: string,
    private tenderlyAccessKey: string,
    private tenderlySave: boolean,
    private chainId: number,
    private logger: Logger
  ) {}

  async validate(userOp: UserOperation, entryPoint: string): Promise<any> {
    const [data, stateOverrides] =
      this.entryPointService.encodeSimulateValidation(entryPoint, userOp);
    const config = {
      method: "post",
      url: `${this.tenderlyApiUrl}/simulate`,
      headers: {
        "Content-Type": "application/json",
        "X-Access-Key": this.tenderlyAccessKey,
      },
      data: JSON.stringify({
        network_id: `${this.chainId}`,
        from: constants.AddressZero,
        to: entryPoint,
        input: data,
        state_objects: {
          ...stateOverrides,
        },
        save: this.tenderlySave,
      }),
    };
    return await axios
      .request(config)
      .then((response) => {
        const parsed = this.entryPointService.parseValidationResult(
          entryPoint,
          userOp,
          response.data.transaction.call_trace[0].output
        );
        return parsed;
      })
      .catch((err) => {
        this.logger.error(`Tenderly validation failed: ${err}`);
      });
  }
}
