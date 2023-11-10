import { Registry } from "prom-client";
import { Logger } from "types/lib";
import { IChainMetrics, createChainMetrics } from "./metrics";

export type Metrics = {
  addChain: (chainId: number) => void;
  chains: { [key: number]: IChainMetrics };
  registry: Registry;
};

export function createMetrics(logger: Logger): Metrics {
  const registry = new Registry();
  const chains: { [key: number]: IChainMetrics } = {};

  function addChain(chainId: number): void {
    const chain = createChainMetrics(registry, chainId);
    logger.debug(`Created metrics for ${chainId}`);
    chains[chainId] = chain;
  }

  return {
    addChain,
    chains,
    registry,
  };
}
