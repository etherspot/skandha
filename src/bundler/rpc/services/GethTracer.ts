import { TraceCall, TraceCallResponse, TracerResult } from 'app/@types';
import { providers } from 'ethers';
import { parseTraceCall } from '../../tracer/parseTraceCall';

export class GethTracer {
  constructor(
    private provider: providers.JsonRpcProvider
  ) {}

  async debug_traceCall (tx: providers.TransactionRequest): Promise<TracerResult> {
    const ret: any = await this.provider.send('debug_traceCall', [tx, 'latest']);
    let traceCallResponse: TraceCall = ret;
    if (ret.result) {
      traceCallResponse = ret.result;
    }
    return parseTraceCall(traceCallResponse as TraceCall, tx.to!);
  }
}
