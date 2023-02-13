import { hexlify } from 'ethers/lib/utils';
import { StructLog, TracerResult } from 'packages/api/src/@types';
import {
  findNextStructLogInDepth,
  parseAddress,
  parseMemory,
  parseNumber,
  parseUint,
  shallowCopyStack
} from '../utils';

export function parseDelegateCall(
  structLog: StructLog,
  index: number,
  structLogs: StructLog[],
  tracerResult: TracerResult
) {
  const stack = shallowCopyStack(structLog.stack);
  if (stack.length < 6) {
    console.log('Faulty DELEGATECALL');
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
