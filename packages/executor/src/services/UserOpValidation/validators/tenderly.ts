import { UserOperation } from "@skandha/types/lib/contracts/UserOperation";
import axios from "axios";
import { Logger } from "@skandha/types/lib";
import { zeroAddress } from "viem";
import { EntryPointService } from "../../EntryPointService";
import { decodeRevertReason } from "../../EntryPointService/utils/decodeRevertReason";
import RpcError from "@skandha/types/lib/api/errors/rpc-error";
import * as RpcErrorCodes from "@skandha/types/lib/api/errors/rpc-error-codes";

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
        save_if_fails: this.tenderlySave,
        simulation_type: "quick"
      }),
    };
    return await axios
      .request(config)
      .then((response) => {
        const callTrace = response.data.transaction.call_trace[0];
        if(callTrace.error) {
          const decodedError = decodeRevertReason(callTrace.output, true);
          if (decodedError != null) {
            throw new RpcError(decodedError, RpcErrorCodes.VALIDATION_FAILED);
          }
          throw new RpcError("execution reverted", RpcErrorCodes.VALIDATION_FAILED);
        }

        const parsed = this.entryPointService.parseValidationResult(
          entryPoint,
          userOp,
          response.data.transaction.call_trace[0].output
        );
        return parsed;
      })
      .catch((err) => {
        this.logger.error(`Tenderly validation failed: ${err}`);
        throw err;
      });
  }
}
