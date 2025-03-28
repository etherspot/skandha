export function minBn(lhs: bigint, rhs: bigint): bigint {
  return lhs > rhs? rhs : lhs;
}

export function maxBn(lhs: bigint, rhs: bigint): bigint {
  return lhs < rhs? rhs : lhs;
}
