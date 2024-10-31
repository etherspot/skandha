import {
  Authorization,
  AuthorizationList,
  verifyAuthorization,
} from "viem/experimental";
import { BigNumber, providers } from "ethers";
import { createWalletClient, http, parseSignature } from "viem";
import { odysseyTestnet } from "viem/chains";
import { UserOperation } from "@skandha/types/lib/contracts/UserOperation";
import { Bundle } from "../../../interfaces";

export async function validateAuthorization(
  chainId: number,
  userOp: UserOperation,
  nonce: number
): Promise<boolean> {
  const authorization: Authorization = {
    contractAddress: userOp.authorizationContract as `0x${string}`,
    chainId,
    nonce,
  };
  return await verifyAuthorization({
    address: userOp.sender as `0x${string}`,
    authorization,
    signature: userOp.authorizationSignature as `0x${string}`,
  });
}

export async function getAuthorizationList(
  chainId: number,
  bundle: Bundle
): Promise<AuthorizationList> {
  if (chainId != odysseyTestnet.id) return [];
  const authorizationList = [];
  for (const entry of bundle.entries) {
    const { userOp } = entry;
    if (!userOp.authorizationContract) continue;
    const authorization: Authorization = {
      contractAddress: userOp.authorizationContract as `0x${string}`,
      chainId,
      nonce: userOp.authorizationNonce!,
    };
    const { r, s, yParity } = parseSignature(
      userOp.authorizationSignature as `0x${string}`
    );
    authorization.r = r;
    authorization.s = s;
    authorization.yParity = yParity;

    authorizationList.push(authorization);
  }
  return authorizationList;
}

export async function getRaw7702Transaction(
  transactionRequest: providers.TransactionRequest,
  authorizationList: AuthorizationList,
  relayer: `0x${string}`
): Promise<string> {
  const wallet = createWalletClient({
    transport: http(),
    account: relayer,
  });
  const transaction = await wallet.signTransaction({
    chain: odysseyTestnet,
    authorizationList,
    to: transactionRequest.to as `0x${string}`,
    gas:
      transactionRequest.gasLimit != undefined
        ? BigNumber.from(transactionRequest.gasLimit).toBigInt()
        : undefined,
    maxFeePerGas:
      transactionRequest.maxFeePerGas != undefined
        ? BigNumber.from(transactionRequest.maxFeePerGas).toBigInt()
        : undefined,
    maxPriorityFeePerGas:
      transactionRequest.maxPriorityFeePerGas != undefined
        ? BigNumber.from(transactionRequest.maxPriorityFeePerGas).toBigInt()
        : undefined,
    data: transactionRequest.data as `0x${string}`,
    nonce:
      transactionRequest.nonce != undefined
        ? BigNumber.from(transactionRequest.nonce).toNumber()
        : undefined,
  });
  return transaction;
}
