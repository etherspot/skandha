import { providers } from "ethers";
import { BundlerCollectorReturn } from "types/lib/executor";
import { TracerPrestateResponse } from "../../src/interfaces";

export class GethTracer {
  async debug_traceCall(
    tx: providers.TransactionRequest
  ): Promise<BundlerCollectorReturn> {
    return {
      callsFromEntryPoint: [],
      keccak: [],
      calls: [],
      logs: [],
      debug: [],
    }
  }
  
  async debug_traceCallPrestate(
    tx: providers.TransactionRequest
  ): Promise<TracerPrestateResponse> {
    return {};
  }
}