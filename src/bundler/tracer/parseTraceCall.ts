import { parseStructLog } from './parseStructLog';
import { TraceCall, TracerTracer } from 'app/@types';

export function parseTraceCall(
  traceCall: TraceCall,
  to: string
) {
  to = to.toLowerCase();
  const tracerOutput: TracerTracer = {
    [to]: {
      storage: {}
    }
  };
  const addressStack: Array<string | undefined> = [to];
  for (let i = 0; i < traceCall.structLogs.length; ++i) {
    const structLog = traceCall.structLogs[i];
    parseStructLog(
      structLog!,
      i,
      traceCall.structLogs,
      addressStack,
      tracerOutput
    );
  }
  return tracerOutput;
}