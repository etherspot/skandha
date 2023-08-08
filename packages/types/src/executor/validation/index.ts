import { BigNumberish } from "ethers";

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

export interface CallEntry {
  to: string;
  from: string;
  type: string; // call opcode
  method: string; // parsed method, or signash if unparsed
  revert?: any; // parsed output from REVERT
  return?: any; // parsed method output.
  value?: BigNumberish;
}
