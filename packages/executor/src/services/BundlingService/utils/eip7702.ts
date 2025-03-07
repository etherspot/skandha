import {
  Authorization,
  AuthorizationList,
  RpcAuthorization,
  RpcAuthorizationList,
} from "viem/experimental";
import { BigNumber } from "ethers";
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
      address: address as `0x${string}`,
      chainId: BigNumber.from(chainId)
        .toHexString()
        .replace(/^0x0+/, "0x") as `0x${string}`,
      nonce: BigNumber.from(nonce)
        .toHexString()
        .replace(/^0x0+/, "0x") as `0x${string}`,
      r: r.toString().replace(/^0x0+/, "0x") as `0x${string}`,
      s: s.toString().replace(/^0x0+/, "0x") as `0x${string}`,
      yParity: yParity,
    };
    const authorization: Authorization = {
      contractAddress: address as `0x${string}`,
      chainId: BigNumber.from(chainId).toNumber(),
      nonce: BigNumber.from(nonce).toNumber(),
      r: r.toString().replace(/^0x0+/, "0x") as `0x${string}`,
      s: s.toString().replace(/^0x0+/, "0x") as `0x${string}`,
      yParity: yParity === "0x0" ? 0 : 1,
    };

    authorizationList.push(authorization);
    rpcAuthorizationList.push(rpcAuthorization);
  }
  return { authorizationList, rpcAuthorizationList };
}
