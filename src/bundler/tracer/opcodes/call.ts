import { StructLog, TracerTracer } from 'app/@types';
import {
  parseAddress,
  parseNumber,
  parseUint,
  shallowCopyStack
} from '../utils';

export function parseCall(
  structLog: StructLog,
  index: number,
  structLogs: StructLog[],
  tracerResult: TracerTracer
) {
  const stack = shallowCopyStack(structLog.stack);
  if (stack.length < 7) {
    console.log('Faulty CALL');
    return;
  }

  const gas = parseUint(stack.pop()!);
  const to = parseAddress(stack.pop()!);
  const value = parseUint(stack.pop()!).toNumber();
  const argsOffset = parseNumber(stack.pop()!);
  const argsSize = parseNumber(stack.pop()!);
  const retOffset = parseNumber(stack.pop()!);
  const retSize = parseNumber(stack.pop()!);

  if (!tracerResult[to]) {
    tracerResult[to] = {
      storage: {},
      value: (tracerResult[to]?.value || 0) + value
    };
  }

  return to;
}
