import { defineChain } from "viem";
import * as chains from "viem/chains";

export function getViemChainDef(chainId: number): chains.Chain {
  const chainsDefs = Object.values(chains);
  for (const chain of chainsDefs) {
    if (chain.id === chainId) return chain;
  }

  return defineChain({
    id: chainId,
    name: "",
    nativeCurrency: {
      name: "",
      symbol: "",
      decimals: 0,
    },
    rpcUrls: {
      default: {
        http: [],
        webSocket: undefined,
      },
    },
  });
}
