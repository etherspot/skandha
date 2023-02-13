import { StructLog, TracerResult } from 'packages/api/src/@types';
import { parseHex, shallowCopyStack } from '../utils';

export async function parseSload(
  structLog: StructLog,
  index: number,
  structLogs: StructLog[],
  tracerResult: TracerResult,
  addressesStack: Array<string | undefined>
) {
  const stack = shallowCopyStack(structLog.stack);
  if (stack.length < 1) {
    console.log('Faulty SLOAD');
    return;
  }
  const key = parseHex(stack.pop()!);
  const stackAfter = shallowCopyStack(structLogs[index + 1]!.stack);
  const value = parseHex(stackAfter.pop()!);

  const address = addressesStack.at(structLog.depth - 1);
  if (address && tracerResult[address]) {
    tracerResult[address]!.storage![key] = (tracerResult[address]!.storage![key] || 0) + 1;
  }
}
