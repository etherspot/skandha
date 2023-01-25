import { parseStructLog } from './parseStructLog';
import { TraceCallResponse, TracerResult } from 'app/@types';

export function parseTraceCall(
  traceCall: TraceCallResponse,
  entryPoint: string
) {
  entryPoint = entryPoint.toLowerCase();
  const tracerOutput: TracerResult = {
    [entryPoint]: {
      storage: {}
    }
  };
  const trace = traceCall.result;
  const addressStack: Array<string | undefined> = [entryPoint];
  for (let i = 0; i < trace.structLogs.length; ++i) {
    const structLog = trace.structLogs[i];
    parseStructLog(
      structLog!,
      i,
      trace.structLogs,
      addressStack,
      tracerOutput
    );
  }
  return tracerOutput;
}