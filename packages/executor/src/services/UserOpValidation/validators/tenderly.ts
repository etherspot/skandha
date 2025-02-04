import { UserOperationStruct } from "@skandha/types/lib/executor/contracts/EntryPoint";
import { IEntryPoint } from "@skandha/types/src/executor/contracts";
import axios from "axios";
import { BigNumber, constants } from "ethers";
import { Logger } from "@skandha/types/lib";

export class TenderlyValidationService {
  constructor(
    private tenderlyApiUrl: string,
    private tenderlyAccessKey: string,
    private chainId: number,
    private logger: Logger
  ) {}

  async validate(
    userOp: UserOperationStruct,
    entryPoint: IEntryPoint,
    gasLimit?: BigNumber
  ): Promise<any> {
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
        to: entryPoint.address,
        input: entryPoint.interface.encodeFunctionData("simulateValidation", [
          userOp,
        ]),
        gas: gasLimit?.toNumber(),
      }),
    };
    return await axios
      .request(config)
      .then((response) => {
        const parsed = entryPoint.interface.parseError(
          response.data.transaction.call_trace[0].output
        );
        return {
          ...parsed,
          errorName: parsed.name,
          errorArgs: parsed.args,
        };
      })
      .catch((err) => {
        this.logger.error(`Tenderly validation failed: ${err}`);
      });
  }
}
