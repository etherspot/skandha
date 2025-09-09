export interface AccessedSlots {
  reads: { [slot: string]: string[] };
  writes: { [slot: string]: number };
  transientReads: { [slots: string]: string[] };
  transientWrites: { [slot: string]: number };
}

export interface ContractSizeInfo {
  opcode: number;
  contractSize: number;
}

export interface NativeTracerReturn {
  accessedSlots: AccessedSlots;
  contractSize: { [address: string]: ContractSizeInfo };
  calls?: NativeTracerReturn[];
  error: string;
  extCodeAccessInfo: string[]
  from: string;
  gas: string;
  gasUsed: string;
  input: string;
  keccak: string[];
  outOfGas: boolean;
  output: string;
  to: string;
  type: string;
  usedOpcodes: { [opCode: string]: number };
  value: string;
}
