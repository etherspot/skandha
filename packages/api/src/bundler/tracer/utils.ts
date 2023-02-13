import { BigNumber } from 'ethers';
import { arrayify, hexStripZeros, hexZeroPad } from 'ethers/lib/utils';
import { StructLog } from 'packages/api/src/@types';

export function findNextStructLogInDepth(
  structLogs: StructLog[],
  depth: number,
  startIndex: number
): [StructLog, StructLog] {
  for (let i = startIndex; i < structLogs.length; i++) {
    if (structLogs[i]!.depth === depth) {
      return [structLogs[i]!, structLogs[i + 1]!];
    }
  }
  throw new Error('Could not find next StructLog in depth');
}

export function parseHex(str: string) {
  if (!str) str = '0';
  return !str.startsWith('0x') ? '0x' + str : str;
}

export function parseNumber(str: string) {
  return parseUint(str).toNumber();
}

export function parseUint(str: string) {
  return BigNumber.from(parseHex(str));
}

export function parseAddress(str: string) {
  return hexZeroPad(hexStripZeros(parseHex(str)), 20);
}

export function parseMemory(strArr: string[]) {
  return arrayify(parseHex(strArr.join('')));
}

export function shallowCopyStack(stack: string[]): string[] {
  return [...stack];
}

export function compareBytecode(
  artifactBytecode: string,
  contractBytecode: string
): number {
  if (artifactBytecode.length <= 2 || contractBytecode.length <= 2) return 0;

  if (typeof artifactBytecode === 'string')
    artifactBytecode = artifactBytecode
      .replace(/\_\_\$/g, '000')
      .replace(/\$\_\_/g, '000');

  let matchedBytes = 0;
  for (let i = 0; i < artifactBytecode.length; i++) {
    if (artifactBytecode[i] === contractBytecode[i]) matchedBytes++;
  }
  if (isNaN(matchedBytes / artifactBytecode.length))
    console.log(matchedBytes, artifactBytecode.length);

  return matchedBytes / artifactBytecode.length;
}
