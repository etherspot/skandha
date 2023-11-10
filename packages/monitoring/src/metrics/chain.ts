import { Registry, Counter } from "prom-client";

export interface IChainMetrics {
  useropsInMempool: Counter.Internal;
  useropsAttempted: Counter.Internal;
  useropsSubmitted: Counter.Internal;
  useropsEstimated: Counter.Internal;
}

const useropsInMempool = new Counter({
  name: "skandha_user_ops_in_mempool_count",
  help: "Number of user ops submitted to mempool",
  labelNames: ["chainId"],
});

const useropsAttempted = new Counter({
  name: "skandha_user_ops_attempted_count",
  help: "Number of user ops attempted to submit on-chain",
  labelNames: ["chainId"],
});

const useropsSubmitted = new Counter({
  name: "skandha_user_ops_submitted_count",
  help: "Number of user ops submitted on-chain",
  labelNames: ["chainId"],
});

const useropsEstimated = new Counter({
  name: "skandha_user_ops_estimated_count",
  help: "Number of user ops estimated",
  labelNames: ["chainId"],
});

/**
 * Per chain metrics
 */
// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export function createChainMetrics(
  registry: Registry,
  chainId: number
): IChainMetrics {
  registry.registerMetric(useropsInMempool);
  registry.registerMetric(useropsAttempted);
  registry.registerMetric(useropsSubmitted);
  registry.registerMetric(useropsEstimated);

  return {
    useropsInMempool: useropsInMempool.labels({ chainId }),
    useropsAttempted: useropsAttempted.labels({ chainId }),
    useropsSubmitted: useropsSubmitted.labels({ chainId }),
    useropsEstimated: useropsEstimated.labels({ chainId }),
  };
}
