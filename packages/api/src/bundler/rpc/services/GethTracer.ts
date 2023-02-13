import { TraceCall, TraceCallResponse, TracerResult } from 'packages/api/src/@types';
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

  // a hack for network that doesn't have traceCall: mine the transaction, and use debug_traceTransaction
  async execAndTrace (tx: providers.TransactionRequest): Promise<TracerResult>{
    const hash = await this.provider.getSigner().sendUncheckedTransaction(tx);
    const ret: any = await this.retryRpcCall('debug_traceTransaction', [hash, {
      enableMemory: true
    }]);
    let traceCallResponse: TraceCall = ret;
    if (ret.result) {
      traceCallResponse = ret.result;
    }
    return parseTraceCall(traceCallResponse as TraceCall, tx.to!);
  }

  private async retryRpcCall(method: string, payload: any, retries: number = 3) {
    let ret: any,
        err: any;
    for (let i = 0; i < retries; ++i) {
      ret = await this.provider.send(method, payload).catch(_ => {
        err = _;
        return null;
      });
      if (!ret) {
        await new Promise(resolve => {
          setTimeout(() => resolve(null), 1000);
        });
        continue;
      }
      return ret;
    }
    throw err;
  }
}
