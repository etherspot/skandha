import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { providers } from "ethers";
import { TracerPrestateResponse, TracerResult } from "../interfaces";
const tracer = readFileSync(
  resolve(process.cwd(), "packages", "executor", "customTracer.js")
).toString();
if (tracer == null) {
  throw new Error("Tracer not found");
}
const regexp = /function \w+\s*\(\s*\)\s*{\s*return\s*(\{[\s\S]+\});?\s*\}\s*$/;
const stringifiedTracer = tracer.match(regexp)![1];

// UNCOMMENT FOR DEBUG PURPOSES
// eslint-disable-next-line no-console
// console.log(
//   JSON.stringify(
//     {
//       tracer: stringifiedTracer.replace(
//         /0xffffffffffffffffffffffffffffffffffffffff/g,
//         "0x5ff137d4b0fdcd49dca30c7cf57e578a026d2789"
//       ),
//     },
//     undefined,
//     2
//   )
// );

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
          tx.to!.toLowerCase()
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
