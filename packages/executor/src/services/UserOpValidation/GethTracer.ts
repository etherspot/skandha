import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { BundlerCollectorReturn } from "@skandha/types/lib/executor";
import {
  PublicClient,
  RpcStateOverride,
  toHex,
  TransactionRequest,
} from "viem";
import { TracerPrestateResponse } from "../../interfaces";
import { StateOverrides } from "../EntryPointService/interfaces";
import { NetworkConfig } from "../../interfaces";
import { NativeTracerReturn } from "@skandha/types/lib/executor/validation/nativeTracer";

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
  constructor(
    private publicClient: PublicClient,
    private config: NetworkConfig
  ) {}

  async debug_traceCall(
    tx: TransactionRequest,
    stateOverrides?: RpcStateOverride
  ): Promise<BundlerCollectorReturn | NativeTracerReturn> {
    const {
      gas: gasLimit,
      ...txWithoutGasLimit
    } = tx;
    const gas = toHex(gasLimit || BigInt(10e6));

    const payload = {
      method: "debug_traceCall" as any,
      params: [
        {
          ...txWithoutGasLimit,
          gas,
          maxFeePerGas: tx.maxFeePerGas ? toHex(tx.maxFeePerGas) : undefined,
          maxPriorityFeePerGas: tx.maxPriorityFeePerGas ? toHex(tx.maxPriorityFeePerGas) : undefined
        } as any,
        "latest",
        {
          stateOverrides,
          tracer: this.config.nativeTracer ? "erc7562Tracer" : stringifiedTracer,
        },
      ],
    }

    const ret: any = await this.publicClient.request(payload as any);

    return ret as BundlerCollectorReturn | NativeTracerReturn;
  }

  async debug_traceCallPrestate(
    tx: TransactionRequest,
    stateOverrides?: StateOverrides
  ): Promise<TracerPrestateResponse> {
    const { gas: gasLimit, ...txWithoutGasLimit } = tx;
    const gas = toHex(gasLimit || BigInt(10e6));
    const ret: any = await this.publicClient.request({
      method: "debug_traceCall" as any,
      params: [
        {
          ...txWithoutGasLimit,
          gas,
          maxFeePerGas: tx.maxFeePerGas ? toHex(tx.maxFeePerGas) : undefined,
          maxPriorityFeePerGas: tx.maxPriorityFeePerGas ? toHex(tx.maxPriorityFeePerGas) : undefined 
        } as any,
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
