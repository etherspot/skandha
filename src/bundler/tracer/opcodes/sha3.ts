import { StructLog, TracerResult  } from 'app/@types';
import { parseHex, parseNumber, shallowCopyStack } from '../utils';

export async function printSha3(
  structLog: StructLog,
  index: number,
  structLogs: StructLog[],
  tracerResult: TracerResult
) {
  const stack = shallowCopyStack(structLog.stack);
  if (stack.length < 1) {
    console.log('Faulty SHA3');
    return;
  }
  const start = parseNumber(stack.pop()!);
  const length = parseNumber(stack.pop()!);

  const stackAfter = shallowCopyStack(structLogs[index + 1]!.stack);
  const result = parseHex(stackAfter.pop()!);

  return result;
}
