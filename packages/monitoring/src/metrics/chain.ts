import { Registry, Counter, Histogram } from "prom-client";

export interface IChainMetrics {
  useropsInMempool: Counter.Internal;
  useropsAttempted: Counter.Internal;
  useropsSubmitted: Counter.Internal;
  useropsEstimated: Counter.Internal;
  useropsTimeToProcess: Histogram.Internal<"chainId">;
  bundlesSubmitted: Counter.Internal;
  bundlesFailed: Counter.Internal;
  useropsInBundle: Histogram.Internal<"chainId">;
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

const bundlesSubmitted = new Counter({
  name: "skandha_bundles_submitted_count",
  help: "Number of bundles successfully submitted on-chain",
  labelNames: ["chainId"],
});

const bundlesFailed = new Counter({
  name: "skandha_bundles_failed_count",
  help: "Number of bundles failed to submit",
  labelNames: ["chainId"],
});

const useropsEstimated = new Counter({
  name: "skandha_user_ops_estimated_count",
  help: "Number of user ops estimated",
  labelNames: ["chainId"],
});

const useropsTimeToProcess = new Histogram({
  name: "skandha_user_op_time_to_process",
  help: "How long did it take for userop to get submitted",
  labelNames: ["chainId"],
  buckets: [
    1, 2, 3, 5, 10, 12, 15, 17, 20, 25, 30, 60, 120, 180, 210, 240, 270, 300,
  ],
});

const useropsInBundle = new Histogram({
  name: "skandha_userops_in_bundle",
  help: "Number of bundles with x userops",
  labelNames: ["chainId"],
  buckets: [1, 2, 3, 4],
});

/**
 * Per chain metrics
 */
export function createChainMetrics(
  registry: Registry,
  chainId: number
): IChainMetrics {
  registry.registerMetric(useropsInMempool);
  registry.registerMetric(useropsAttempted);
  registry.registerMetric(useropsSubmitted);
  registry.registerMetric(useropsEstimated);
  registry.registerMetric(useropsTimeToProcess);
  registry.registerMetric(bundlesFailed);
  registry.registerMetric(bundlesSubmitted);
  registry.registerMetric(useropsInBundle);

  return {
    useropsInMempool: useropsInMempool.labels({ chainId }),
    useropsAttempted: useropsAttempted.labels({ chainId }),
    useropsSubmitted: useropsSubmitted.labels({ chainId }),
    useropsEstimated: useropsEstimated.labels({ chainId }),
    useropsTimeToProcess: useropsTimeToProcess.labels({ chainId }),
    bundlesSubmitted: bundlesSubmitted.labels({ chainId }),
    bundlesFailed: bundlesFailed.labels({ chainId }),
    useropsInBundle: useropsInBundle.labels({ chainId }),
  };
}
