import { StructLog, TracerResult } from 'app/@types';
import {
  findNextStructLogInDepth,
  parseAddress,
  parseNumber,
  parseUint,
  shallowCopyStack
} from '../utils';

export function parseCreate2(
  structLog: StructLog,
  index: number,
  structLogs: StructLog[],
  tracerResult: TracerResult
) {
  const stack = shallowCopyStack(structLog.stack);
  if (stack.length < 4) {
    console.log('Faulty CREATE2');
    return;
  }

  const value = parseUint(stack.pop()!);
  const codeOffset = parseNumber(stack.pop()!);
  const codeSize = parseNumber(stack.pop()!);
  const salt = parseUint(stack.pop()!);

  const [structLogNextNext] = findNextStructLogInDepth(
    structLogs,
    structLog.depth,
    index + 1 // find next structLog in the same depth
  );
  const deployedAddress = parseAddress(
    shallowCopyStack(structLogNextNext.stack).pop()!
  );

  if (!tracerResult[deployedAddress]) {
    tracerResult[deployedAddress] = {
      storage: {}
    };
  }

  return deployedAddress;
}
