import { RPCResponse, TraceCallResponse, TracerResult } from 'app/@types';
import { providers } from 'ethers';
import { parseTraceCall } from '../../tracer/parseTraceCall';

export class GethTracer {
  constructor(
    private provider: providers.JsonRpcProvider
  ) {}

  async debug_traceCall (tx: providers.TransactionRequest): Promise<TracerResult> {
    const ret: RPCResponse = await this.provider.send('debug_traceCall', [tx, 'latest']);
    return parseTraceCall(ret.result as TraceCallResponse, '0x3FF3d354e43b2271BDd6b008aF3CCBeB928Ee693');
  }
}
