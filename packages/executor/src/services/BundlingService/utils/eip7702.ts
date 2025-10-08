import {
  Authorization,
  AuthorizationList,
  Hex,
  RpcAuthorization,
  RpcAuthorizationList,
  toHex,
} from "viem";
import { Bundle } from "../../../interfaces.js";

export function getAuthorizationList(bundle: Bundle): {
  authorizationList: AuthorizationList;
  rpcAuthorizationList: RpcAuthorizationList;
} {
  const authorizationList: Authorization[] = [];
  const rpcAuthorizationList: RpcAuthorization[] = [];
  for (const entry of bundle.entries) {
    const { userOp } = entry;
    if (!userOp.eip7702Auth) continue;
    const { address, chainId, nonce, r, s, yParity } = userOp.eip7702Auth;
    // Remove leading zeroes from r and s values
    const rTrimmed: Hex = r.startsWith('0x') ? `0x${BigInt(r).toString(16)}` : r;
    const sTrimmed: Hex = s.startsWith('0x') ? `0x${BigInt(s).toString(16)}` : s;
    
    const rpcAuthorization: RpcAuthorization = {
      address,
      chainId: toHex(BigInt(chainId)),
      nonce: toHex(BigInt(nonce)),
      r: rTrimmed,
      s: sTrimmed,
      yParity,
    };
    const authorization: Authorization = {
      address: address as `0x${string}`,
      chainId: Number(BigInt(chainId)),
      nonce: Number(BigInt(nonce)),
      r: rTrimmed,
      s: sTrimmed,
      yParity: yParity === "0x0" ? 0 : 1,
    };

    authorizationList.push(authorization);
    rpcAuthorizationList.push(rpcAuthorization);
  }
  return { authorizationList, rpcAuthorizationList };
}
