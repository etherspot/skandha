import { BigNumber } from "ethers";

export function minBn(lhs: BigNumber, rhs: BigNumber): BigNumber {
  return lhs.gt(rhs) ? rhs : lhs;
}

export function maxBn(lhs: BigNumber, rhs: BigNumber): BigNumber {
  return lhs.lt(rhs) ? rhs : lhs;
}
