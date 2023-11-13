import { Registry } from "prom-client";
import { Logger } from "types/lib";
import {
  IChainMetrics,
  IP2PMetrics,
  createChainMetrics,
  createP2PMetrics,
} from "./metrics";

export type PerChainMetrics = IChainMetrics & Partial<IP2PMetrics>;
export type AllChainsMetrics = { [chainId: number]: PerChainMetrics };

export type CreateMetricsRes = {
  addChain: (chainId: number) => void;
  chains: AllChainsMetrics;
  registry: Registry;
};

export type CreateMetricsOptions = {
  p2p: boolean;
};

export function createMetrics(
  options: CreateMetricsOptions,
  logger: Logger
): CreateMetricsRes {
  const registry = new Registry();
  const chains: { [key: number]: PerChainMetrics } = {};

  function addChain(chainId: number): void {
    const chain = createChainMetrics(registry, chainId);
    const p2p = options.p2p ? createP2PMetrics(registry, chainId) : {};

    logger.debug(`Created metrics for ${chainId}`);

    chains[chainId] = {
      ...chain,
      ...p2p,
    };
  }

  return {
    addChain,
    chains,
    registry,
  };
}
