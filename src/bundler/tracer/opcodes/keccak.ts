import { StructLog, TracerTracer } from 'app/@types';
import {
  parseAddress,
  parseNumber,
  parseUint,
  shallowCopyStack,
  parseMemory,
  parseHex
} from '../utils';
import { hexlify } from 'ethers/lib/utils';

export function parseKeccak(
  structLog: StructLog,
  index: number,
  structLogs: StructLog[],
  tracerResult: TracerTracer,
  addressesStack: Array<string | undefined>
) {
  const stack = shallowCopyStack(structLog.stack);
  if (stack.length < 1) {
    console.log('Faulty SHA3');
    return;
  }

  const start = parseNumber(stack.pop()!);
  const length = parseNumber(stack.pop()!);

  const memory = parseMemory(structLog.memory);
  const inputToBeHashed = hexlify(memory.slice(start, start + length));

  const stackAfter = shallowCopyStack(structLogs[index + 1]!.stack);
  const result = parseHex(stackAfter.pop()!);

  const address = addressesStack[structLog.depth - 1];
  if (address && tracerResult[address]) {
    if (!tracerResult[address]!.keccak) {
      tracerResult[address]!.keccak = {};
    }
    tracerResult[address]!.keccak![inputToBeHashed] = result;
  }
}
