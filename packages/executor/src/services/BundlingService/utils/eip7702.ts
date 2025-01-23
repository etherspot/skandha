import { Authorization, AuthorizationList } from "viem/experimental";
import { Bundle } from "../../../interfaces";

export function getAuthorizationList(bundle: Bundle): AuthorizationList {
  const authorizationList: Authorization[] = [];
  for (const entry of bundle.entries) {
    const { userOp } = entry;
    if (!userOp.eip7702Auth) continue;
    const { address, chain, nonce, r, s, yParity } = userOp.eip7702Auth;
    const authorization: Authorization = {
      contractAddress: address as `0x${string}`,
      chainId: chain,
      nonce,
      r: r.toString() as `0x${string}`,
      s: s.toString() as `0x${string}`,
      yParity: yParity,
      v: yParity === 0 ? BigInt(27) : BigInt(28),
    };

    authorizationList.push(authorization);
  }
  return authorizationList;
}
