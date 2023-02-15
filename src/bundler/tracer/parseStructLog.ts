import { StructLog, TracerResult, TracerTracer } from 'app/@types';
import { parseCall } from './opcodes/call';
import { parseCallCode } from './opcodes/callcode';
import { parseCreate } from './opcodes/create';
import { parseCreate2 } from './opcodes/create2';
import { parseDelegateCall } from './opcodes/delegatecall';
import { parseStaticCall } from './opcodes/staticcall';
import { parseSload } from './opcodes/sload';
import { parseGas } from './opcodes/gas';
import { parseKeccak } from './opcodes/keccak';

// TODO: add value

export function parseStructLog(
  structLog: StructLog,
  index: number,
  structLogs: StructLog[],
  addressStack: Array<string | undefined>,
  tracerResult: TracerTracer
) {
  switch (structLog.op) {
    case 'CREATE':
      // TODO: forbidden if depth > 1
      addressStack.push(
        parseCreate(structLog, index, structLogs, tracerResult)
      );
      break;
    case 'CREATE2':
      // TODO: forbidden if depth > 1, but allowed if userOp.initCode.length > 0 and must return userOp.sender
      // one option: allow only one CREATE2 opcode call (in the first (deployment) block), otherwise forbid CREATE2
      addressStack.push(
        parseCreate2(structLog, index, structLogs, tracerResult)
      );
      break;
    case 'CALL':
      addressStack.push(
        parseCall(structLog, index, structLogs, tracerResult)
      );
      break;
    case 'CALLCODE':
      parseCallCode(structLog, index, structLogs, tracerResult);
      break;
    case 'STATICCALL':
      addressStack.push(
        parseStaticCall(structLog, index, structLogs, tracerResult)
      );
      break;
    case 'DELEGATECALL':
      addressStack.push(
        parseDelegateCall(structLog, index, structLogs, tracerResult)
      );
      break;
    case 'SLOAD':
      parseSload(structLog, index, structLogs, tracerResult, addressStack);
      break;
    case 'SSTORE':
      parseSload(structLog, index, structLogs, tracerResult, addressStack);
      break;
    case 'GAS':
      parseGas(structLog, index, structLogs, tracerResult, addressStack);
      break;
    case 'REVERT':
      addressStack.pop();
      break;
    case 'RETURN':
      addressStack.pop();
      break;
    case 'STOP':
      addressStack.pop();
      break;
    case 'SHA3':
      parseKeccak(structLog, index, structLogs, tracerResult, addressStack);
      break;
    case 'GASPRICE':
    case 'GASLIMIT':
    case 'DIFFICULTY':
    case 'TIMESTAMP':
    case 'BASEFEE':
    case 'BLOCKHASH':
    case 'NUMBER':
    case 'SELFBALANCE':
    case 'BALANCE':
    case 'ORIGIN':
    case 'COINBASE':
    case 'SELFDESTRUCT':
      if (structLog.depth > 2) {
        const address = addressStack[structLog.depth - 1];
        if (address) {
          tracerResult[address] = {
            violation: {
              [structLog.op]: true
            },
            ...tracerResult[address]
          };
        }
      }
      break;
    default:
      break;
  }
}