import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { BigNumber, providers } from "ethers";
import { BundlerCollectorReturn } from "@skandha/types/lib/executor";
import { TracerPrestateResponse } from "../../interfaces";
import { StateOverrides } from "../EntryPointService/interfaces";

const tracer = readFileSync(
  resolve(process.cwd(), "packages", "executor", "tracer.js")
).toString();
if (tracer == null) {
  throw new Error("Tracer not found");
}
const regexp = /function \w+\s*\(\s*\)\s*{\s*return\s*(\{[\s\S]+\});?\s*\}\s*$/;
const stringifiedTracer = tracer.match(regexp)![1];

export class GethTracer {
  constructor(private provider: providers.JsonRpcProvider) {}

  async debug_traceCall(
    tx: providers.TransactionRequest,
    stateOverrides?: StateOverrides
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
        stateOverrides,
        tracer: stringifiedTracer,
      },
    ]);

    return ret as BundlerCollectorReturn;
  }

  async debug_traceCallPrestate(
    tx: providers.TransactionRequest,
    stateOverrides?: StateOverrides
  ): Promise<TracerPrestateResponse> {
    const ret: any = await this.provider.send("debug_traceCall", [
      tx,
      "latest",
      {
        tracer: "prestateTracer",
        stateOverrides,
      },
    ]);
    return ret;
  }
}
