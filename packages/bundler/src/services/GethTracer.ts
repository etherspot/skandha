import { providers } from "ethers";
import { TracerPrestateResponse, TracerResult } from "../interfaces";
// eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
const { tracer } = require("../../tracer/customTracer.js");

const regexp = /function \w+\s*\(\s*\)\s*{\s*return\s*(\{[\s\S]+\});?\s*\}\s*$/;
const stringifiedTracer = tracer.toString().match(regexp)[1];

export class GethTracer {
  constructor(private provider: providers.JsonRpcProvider) {}

  async debug_traceCall(
    tx: providers.TransactionRequest
  ): Promise<TracerResult> {
    const ret: any = await this.provider.send("debug_traceCall", [
      tx,
      "latest",
      {
        tracer: stringifiedTracer.replace(
          /0xffffffffffffffffffffffffffffffffffffffff/g,
          tx.to?.toLowerCase()
        ),
      },
    ]);

    return ret as TracerResult;
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
