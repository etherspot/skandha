import { StructLog, TracerResult } from 'app/@types';

export async function parseGas(
  structLog: StructLog,
  index: number,
  structLogs: StructLog[],
  tracerResult: TracerResult,
  addressStack: Array<string | undefined>,
) {
  if (structLog.depth === 1) {
    return;
  }

  const structLogAfter = structLogs[index + 1];
  if (
    !structLogAfter ||
    !structLogAfter.op.match(/^((CALLCODE)|(CALL)|(DELEGATECALL)|(STATICCALL))$/)
  ) {
    const address = addressStack[structLog.depth - 1];
    if (address) {
      tracerResult[address] = {
        violation: {
          GAS: true
        },
        ...tracerResult[address]
      };
    }
  }
}
