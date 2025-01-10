import {
  Authorization,
  AuthorizationList,
  verifyAuthorization,
} from "viem/experimental";
import { BigNumber, ethers, providers } from "ethers";
import {
  createPublicClient,
  createWalletClient,
  http,
  parseSignature,
} from "viem";
import { odysseyTestnet } from "viem/chains";
import { UserOperation } from "@skandha/types/lib/contracts/UserOperation";
import { privateKeyToAccount } from "viem/accounts";
import { Bundle } from "../../../interfaces";

export async function validateAuthorization(
  chainId: number,
  userOp: UserOperation,
  nonce: number
): Promise<boolean> {
  const authorization: Authorization = {
    contractAddress: userOp.authorizationContract as `0x${string}`,
    chainId,
    nonce: ethers.BigNumber.from(nonce).toNumber(),
    ...parseSignature(userOp.authorizationSignature as `0x${string}`),
  };
  console.log("authorization check", authorization);
  return await verifyAuthorization({
    address: userOp.sender as `0x${string}`,
    authorization,
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
      nonce: BigNumber.from(userOp.authorizationNonce!).toNumber(),
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
    transport: http(odysseyTestnet.rpcUrls.default.http[0]),
    account: privateKeyToAccount(relayer),
  });
  const publicClient = createPublicClient({
    chain: odysseyTestnet,
    transport: http(odysseyTestnet.rpcUrls.default.http[0]),
  });
  const txRequest = {
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
  };
  // test
  // txRequest.to = "0xd8da6bf26964af9d7eed9e03e53415d37aa96045";
  // txRequest.data = "0x";
  console.log("viem txrequest", txRequest);
  // try {
  //   console.log(
  //     "estimation",
  //     await publicClient.estimateGas({
  //       ...txRequest,
  //       gas: undefined,
  //     })
  //   );
  // } catch (err) {
  //   console.log(err);
  //   throw new Error("failed estimation");
  // }
  const transaction = await wallet
    .signTransaction({
      ...txRequest,
      type: "eip7702",
    })
    .catch((err) => {
      console.log(err);
      throw err;
    });
  return transaction;
}
