import { providers } from "ethers";
import { BundlerCollectorReturn } from "@skandha/types/lib/executor";
import { TracerPrestateResponse } from "../../src/interfaces";

export class GethTracer {
  async debug_traceCall(
    _tx: providers.TransactionRequest
  ): Promise<BundlerCollectorReturn> {
    return {
      callsFromEntryPoint: [],
      keccak: [],
      calls: [],
      logs: [],
      debug: [],
    };
  }

  async debug_traceCallPrestate(): Promise<TracerPrestateResponse> {
    return {};
  }
}
