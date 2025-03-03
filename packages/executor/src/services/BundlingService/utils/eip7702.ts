import { Authorization, AuthorizationList } from "viem/experimental";
import { BigNumber } from "ethers";
import { Bundle } from "../../../interfaces";

export function getAuthorizationList(bundle: Bundle): AuthorizationList {
  const authorizationList: Authorization[] = [];
  for (const entry of bundle.entries) {
    const { userOp } = entry;
    if (!userOp.eip7702Auth) continue;
    const { address, chainId, nonce, r, s, yParity } = userOp.eip7702Auth;
    const authorization: Authorization = {
      contractAddress: address as `0x${string}`,
      chainId: BigNumber.from(chainId).toNumber(),
      nonce: BigNumber.from(nonce).toNumber(),
      r: r.toString() as `0x${string}`,
      s: s.toString() as `0x${string}`,
      yParity: yParity === "0x0" ? 0 : 1,
      v: yParity === "0x0" ? BigInt(27) : BigInt(28),
    };

    authorizationList.push(authorization);
  }
  return authorizationList;
}
