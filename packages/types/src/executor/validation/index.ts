import { BigNumber } from "ethers";

type LogTracerFunc = () => LogTracer;

// the trace options param for debug_traceCall and debug_traceTransaction
export interface TraceOptions {
  disableStorage?: boolean; // Setting this to true will disable storage capture (default = false).
  disableStack?: boolean; // Setting this to true will disable stack capture (default = false).
  enableMemory?: boolean; // Setting this to true will enable memory capture (default = false).
  enableReturnData?: boolean; // Setting this to true will enable return data capture (default = false).
  tracer?: LogTracerFunc | string; // Setting this will enable JavaScript-based transaction tracing, described below. If set, the previous four arguments will be ignored.
  timeout?: string; // Overrides the default timeout of 5 seconds for JavaScript-based tracing calls. Valid time units are "ns", "us" (or "µs"), "ms", "s", "m", "h".
}

// the result type of debug_traceCall and debug_traceTransaction
export interface TraceResult {
  gas: number;
  returnValue: string;
  structLogs: [TraceResultEntry];
}

export interface TraceResultEntry {
  depth: number;
  error: string;
  gas: number;
  gasCost: number;
  memory?: [string];
  op: string;
  pc: number;
  stack: [string];
  storage?: [string];
}

export interface LogContext {
  type: string; // one of the two values CALL and CREATE
  from: string; // Address, sender of the transaction
  to: string; // Address, target of the transaction
  input: Buffer; // Buffer, input transaction data
  gas: number; // Number, gas budget of the transaction
  gasUsed: number; //  Number, amount of gas used in executing the transaction (excludes txdata costs)
  gasPrice: number; // Number, gas price configured in the transaction being executed
  intrinsicGas: number; // Number, intrinsic gas for the transaction being executed
  value: BigNumber; // big.Int, amount to be transferred in wei
  block: number; // Number, block number
  output: Buffer; // Buffer, value returned from EVM
  time: string; // String, execution runtime

  // And these fields are only available for tracing mined transactions (i.e. not available when doing debug_traceCall):
  blockHash?: Buffer; // - Buffer, hash of the block that holds the transaction being executed
  txIndex?: number; // - Number, index of the transaction being executed in the block
  txHash?: Buffer; // - Buffer, hash of the transaction being executed
}

export interface LogTracer {
  // mandatory: result, fault
  // result is a function that takes two arguments ctx and db, and is expected to return
  // a JSON-serializable value to return to the RPC caller.
  result: (ctx: LogContext, db: LogDb) => any;

  // fault is a function that takes two arguments, log and db, just like step and is
  // invoked when an error happens during the execution of an opcode which wasn’t reported in step. The method log.getError() has information about the error.
  fault: (log: LogStep, db: LogDb) => void;

  // optional (config is geth-level "cfg")
  setup?: (config: any) => any;

  // optional
  step?: (log: LogStep, db: LogDb) => any;

  // enter and exit must be present or omitted together.
  enter?: (frame: LogCallFrame) => void;

  exit?: (frame: LogFrameResult) => void;
}

export interface LogCallFrame {
  // - returns a string which has the type of the call frame
  getType: () => string;
  // - returns the address of the call frame sender
  getFrom: () => string;
  // - returns the address of the call frame target
  getTo: () => string;
  // - returns the input as a buffer
  getInput: () => string;
  // - returns a Number which has the amount of gas provided for the frame
  getGas: () => number;
  // - returns a big.Int with the amount to be transferred only if available, otherwise undefined
  getValue: () => BigNumber;
}

export interface LogFrameResult {
  getGasUsed: () => number; // - returns amount of gas used throughout the frame as a Number
  getOutput: () => Buffer; // - returns the output as a buffer
  getError: () => any; // - returns an error if one occured during execution and undefined` otherwise
}

export interface LogOpCode {
  isPush: () => boolean; // returns true if the opcode is a PUSHn
  toString: () => string; // returns the string representation of the opcode
  toNumber: () => number; // returns the opcode’s number
}

export interface LogMemory {
  slice: (start: number, stop: number) => any; // returns the specified segment of memory as a byte slice
  getUint: (offset: number) => any; // returns the 32 bytes at the given offset
  length: () => number; // returns the memory size
}

export interface LogStack {
  peek: (idx: number) => any; // returns the idx-th element from the top of the stack (0 is the topmost element) as a big.Int
  length: () => number; // returns the number of elements in the stack
}

export interface LogContract {
  getCaller: () => any; // returns the address of the caller
  getAddress: () => string; // returns the address of the current contract
  getValue: () => BigNumber; // returns the amount of value sent from caller to contract as a big.Int
  getInput: () => any; // returns the input data passed to the contract
}

export interface LogStep {
  op: LogOpCode; // Object, an OpCode object representing the current opcode
  stack: LogStack; // Object, a structure representing the EVM execution stack
  memory: LogMemory; // Object, a structure representing the contract’s memory space
  contract: LogContract; // Object, an object representing the account executing the current operation

  getPC: () => number; // returns a Number with the current program counter
  getGas: () => number; // returns a Number with the amount of gas remaining
  getCost: () => number; // returns the cost of the opcode as a Number
  getDepth: () => number; // returns the execution depth as a Number
  getRefund: () => number; // returns the amount to be refunded as a Number
  getError: () => string | undefined; //  returns information about the error if one occured, otherwise returns undefined
  // If error is non-empty, all other fields should be ignored.
}

export interface LogDb {
  getBalance: (address: string) => BigNumber; // - returns a big.Int with the specified account’s balance
  getNonce: (address: string) => number; // returns a Number with the specified account’s nonce
  getCode: (address: string) => any; // returns a byte slice with the code for the specified account
  getState: (address: string, hash: string) => any; // returns the state value for the specified account and the specified hash
  exists: (address: string) => boolean; // returns true if the specified address exists
}

/**
 * return type of our BundlerCollectorTracer.
 * collect access and opcodes, split into "levels" based on NUMBER opcode
 * keccak, calls and logs are collected globally, since the levels are unimportant for them.
 */
export interface BundlerCollectorReturn {
  /**
   * storage and opcode info, collected on top-level calls from EntryPoint
   */
  callsFromEntryPoint: TopLevelCallInfo[];

  /**
   * values passed into KECCAK opcode
   */
  keccak: string[];
  calls: Array<ExitInfo | MethodInfo>;
  logs: LogInfo[];
  debug: any[];
}

export interface MethodInfo {
  type: string;
  from: string;
  to: string;
  method: string;
  value: any;
  gas: number;
}

export interface ExitInfo {
  type: "REVERT" | "RETURN";
  gasUsed: number;
  data: string;
}

export interface TopLevelCallInfo {
  topLevelMethodSig: string;
  topLevelTargetAddress: string;
  opcodes: { [opcode: string]: number };
  access: { [address: string]: AccessInfo };
  contractSize: { [addr: string]: number };
  oog?: boolean;
}

export interface AccessInfo {
  // slot value, just prior this operation
  reads: { [slot: string]: string };
  // count of writes.
  writes: { [slot: string]: number };
}

export interface LogInfo {
  topics: string[];
  data: string;
}

/**
 * type-safe local storage of our collector. contains all return-value properties.
 * (also defines all "trace-local" variables and functions)
 */
export interface BundlerCollectorTracer
  extends LogTracer,
    BundlerCollectorReturn {
  lastOp: string;
  stopCollectingTopic: string;
  stopCollecting: boolean;
  currentLevel: TopLevelCallInfo;
  topLevelCallCounter: number;
  countSlot: (list: { [key: string]: number | undefined }, key: any) => void;
}
