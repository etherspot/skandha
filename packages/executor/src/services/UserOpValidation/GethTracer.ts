import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { BigNumber, providers } from "ethers";
import { BundlerCollectorReturn } from "types/lib/executor";
import { TracerPrestateResponse } from "../../interfaces";

const tracer = readFileSync(
  resolve(process.cwd(), "packages", "executor", "tracer.js")
).toString();
if (tracer == null) {
  throw new Error("Tracer not found");
}
const regexp = /function \w+\s*\(\s*\)\s*{\s*return\s*(\{[\s\S]+\});?\s*\}\s*$/;
const stringifiedTracer = tracer
  .match(regexp)![1]
  .replace(/\r\n/g, "")
  .replace(/( ){2,}/g, " ");

// UNCOMMENT FOR DEBUG PURPOSES
// eslint-disable-next-line no-console
// console.log(
//   JSON.stringify(
//     {
//       tracer: stringifiedTracer,
//     },
//     undefined,
//     2
//   )
// );

export class GethTracer {
  constructor(private provider: providers.JsonRpcProvider) {}

  async debug_traceCall(
    tx: providers.TransactionRequest
  ): Promise<BundlerCollectorReturn> {
    const { gasLimit, ...txWithoutGasLimit } = tx;
    const gas = `0x${BigNumber.from(gasLimit ?? 10e6)
      .toNumber()
      .toString(16)}`; // we're not using toHexString() of BigNumber, because it adds a leading zero which is not accepted by the nodes
    const ret: any = await this.provider.send("debug_traceCall", [
      {
        ...txWithoutGasLimit,
        gas,
      },
      "latest",
      {
        tracer: stringifiedTracer,
      },
    ]);

    return ret as BundlerCollectorReturn;
  }

  async debug_traceCallPrestate(
    tx: providers.TransactionRequest
  ): Promise<TracerPrestateResponse> {
    const ret: any = await this.provider.send("debug_traceCall", [
      tx,
      "latest",
      { tracer: "prestateTracer" },
    ]);
    return ret;
  }
}
