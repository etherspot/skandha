import { UserOperation } from "@skandha/types/lib/contracts/UserOperation";
import axios from "axios";
import { Logger } from "@skandha/types/lib";
import { zeroAddress } from "viem";
import { EntryPointService } from "../../EntryPointService";
import RpcError from "@skandha/types/lib/api/errors/rpc-error";
import * as RpcErrorCodes from "@skandha/types/lib/api/errors/rpc-error-codes";
import { decodeRevertReason } from "../../EntryPointService/utils/decodeRevertReason";

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
        from: zeroAddress,
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
        const callTrace = response.data.transaction.call_trace[0];
        if(callTrace.error) {
          throw new RpcError(
            decodeRevertReason(callTrace.output) ?? "execution reverted",
            RpcErrorCodes.VALIDATION_FAILED
          );
        }
        const parsed = this.entryPointService.parseValidationResult(
          entryPoint,
          userOp,
          callTrace.output
        );
        return parsed;
      })
      .catch((err) => {
        this.logger.error(`Tenderly validation failed: ${err}`);
        throw err;
      });
  }
}
