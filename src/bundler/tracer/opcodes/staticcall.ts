import { StructLog, TracerTracer } from 'app/@types';
import {
  parseAddress,
  parseNumber,
  parseUint,
  shallowCopyStack
} from '../utils';

export function parseStaticCall(
  structLog: StructLog,
  index: number,
  structLogs: StructLog[],
  tracerResult: TracerTracer
) {
  const stack = shallowCopyStack(structLog.stack);
  if (stack.length < 6) {
    console.log('Faulty STATICCALL');
    return;
  }

  const gas = parseUint(stack.pop()!);
  const to = parseAddress(stack.pop()!);
  const argsOffset = parseNumber(stack.pop()!);
  const argsSize = parseNumber(stack.pop()!);
  const retOffset = parseNumber(stack.pop()!);
  const retSize = parseNumber(stack.pop()!);

  if (!tracerResult[to]) {
    tracerResult[to] = {
      storage: {}
    };
  }

  return to;
}
