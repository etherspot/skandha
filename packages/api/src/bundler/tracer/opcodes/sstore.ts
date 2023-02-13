import { StructLog, TracerResult } from 'packages/api/src/@types';
import { parseHex, shallowCopyStack } from '../utils';

export async function printSstore(
  structLog: StructLog,
  index: number,
  structLogs: StructLog[],
  tracerResult: TracerResult,
  addressesStack: Array<string | undefined>
) {
  const stack = shallowCopyStack(structLog.stack);
  if (stack.length < 2) {
    console.log('Faulty SSTORE');
    return;
  }
  const key = parseHex(stack.pop()!);
  const value = parseHex(stack.pop()!);

  const address = addressesStack.at(structLog.depth);
  if (address && tracerResult[address]) {
    tracerResult[address]!.storage![key] = (tracerResult[address]!.storage![key] || 0) + 1;
  }
}
