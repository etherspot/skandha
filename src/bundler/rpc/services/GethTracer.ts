import { TraceCall, TracerResult } from 'app/@types';
import { providers } from 'ethers';
import { parseTraceCall } from '../../tracer/parseTraceCall';
const { tracer } = require('../../tracer/customTracer.js');

const regexp = /function \w+\s*\(\s*\)\s*{\s*return\s*(\{[\s\S]+\});?\s*\}\s*$/;
const stringifiedTracer = tracer.toString().match(regexp)[1];

export class GethTracer {
  constructor(
    private provider: providers.JsonRpcProvider
  ) {}

  async debug_traceCall (tx: providers.TransactionRequest): Promise<TracerResult> {
    const ret: any = await this.provider.send(
      'debug_traceCall',
      [
        tx,
        'latest',
        {
          tracer: stringifiedTracer.replace(/0xffffffffffffffffffffffffffffffffffffffff/g, tx.to?.toLowerCase())
        }
      ]
    );

    return ret as TracerResult;
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
    return {
      trace: parseTraceCall(traceCallResponse as TraceCall, tx.to!),
      calls: []
    };
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
