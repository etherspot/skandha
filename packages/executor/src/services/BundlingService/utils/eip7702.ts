import {
  Authorization,
  AuthorizationList,
  RpcAuthorization,
  RpcAuthorizationList,
  toHex,
} from "viem";
import { Bundle } from "../../../interfaces";

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
    const rpcAuthorization: RpcAuthorization = {
      address,
      chainId: toHex(BigInt(chainId)),
      nonce: toHex(BigInt(nonce)),
      r,
      s,
      yParity,
    };
    const authorization: Authorization = {
      address: address as `0x${string}`,
      chainId: Number(BigInt(chainId)),
      nonce: Number(BigInt(nonce)),
      r,
      s,
      yParity: yParity === "0x0" ? 0 : 1,
    };

    authorizationList.push(authorization);
    rpcAuthorizationList.push(rpcAuthorization);
  }
  return { authorizationList, rpcAuthorizationList };
}
