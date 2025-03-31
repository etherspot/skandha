import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { BundlerCollectorReturn } from "@skandha/types/lib/executor";
import {
  PublicClient,
  RpcStateOverride,
  toHex,
  Transaction,
  TransactionRequest,
} from "viem";
import { TracerPrestateResponse } from "../../interfaces";
import { StateOverrides } from "../EntryPointService/interfaces";

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

export class GethTracer {
  constructor(private publicClient: PublicClient) {}

  async debug_traceCall(
    tx: TransactionRequest,
    stateOverrides?: RpcStateOverride
  ): Promise<BundlerCollectorReturn> {
    const { gas: gasLimit, ...txWithoutGasLimit } = tx;
    const gas = toHex(gasLimit!);

    const ret: any = await this.publicClient.request({
      method: "debug_traceCall" as any,
      params: [
        {
          ...txWithoutGasLimit,
          gas,
        } as any,
        "latest",
        {
          stateOverrides,
          tracer: stringifiedTracer,
        },
      ],
    });

    return ret as BundlerCollectorReturn;
  }

  async debug_traceCallPrestate(
    tx: TransactionRequest,
    stateOverrides?: StateOverrides
  ): Promise<TracerPrestateResponse> {
    const { gas: gasLimit, ...txWithoutGasLimit } = tx;
    const gas = toHex(gasLimit!);
    const ret: any = await this.publicClient.request({
      method: "debug_traceCall" as any,
      params: [
        { ...txWithoutGasLimit, gas } as any,
        "latest",
        {
          tracer: "prestateTracer" as any,
          stateOverrides,
        },
      ],
    });
    return ret;
  }
}
