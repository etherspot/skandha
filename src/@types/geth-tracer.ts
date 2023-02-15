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
  trace: TracerTracer,
  calls: TracerCall[]
}

export interface TracerTracer {
  [address: string]: {
    balance?: BigNumberish;
    contractSize?: number,
    number?: number,
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
  },
}

export interface TracerCall {
  type: string;
  from?: string;
  to?: string;
  method?: string;
  gas?: number;
  data?: string;
  return?: any;
  revert?: any;
  value?: BigNumberish;
}

export interface TracerPrestateResponse {
  [address: string]: {
    balance: BigNumberish;
    nonce: number,
    storage: {
      [slot: string]: number
    },
    code: BytesLike,
  },
}
