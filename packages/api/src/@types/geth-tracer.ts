import { BigNumberish, BytesLike } from 'ethers';

export interface RPCResponse {
  jsonrpc: string,
  id: number,
  result?: any
}

export interface StructLog {
  pc: number;
  op: string;
  gas: number;
  gasCost: number;
  depth: number;
  stack: string[];
  memory: string[];
  storage: {};
}

export interface TraceCall {
  gas: number;
  failed: boolean;
  returnValue: string;
  structLogs: StructLog[]
}

export interface TraceCallResponse extends RPCResponse {
  result: TraceCall
}

export interface TracerResult {
  [address: string]: {
    balance?: BigNumberish;
    code?: BytesLike,
    storage?: {
      [slot: string]: number
    },
    keccak?: {
      [slot: string]: any
    }
    violation?: {
      [opcode: string]: boolean
    },
    value?: number
  }
}
