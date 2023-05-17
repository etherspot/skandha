import { mapValues } from "utils/lib";
import logger from "api/lib/logger";
import { Config } from "executor/lib/config";
import { NetworkEvent, NetworkEventBus } from "../events";
import { GossipType } from "../gossip/interface";
import { createGossipQueues } from "./gossipQueues";
import { PendingGossipsubMessage } from "./types";
import { ValidatorFnsModules } from "./gossipHandlers";
import { NetworkWorker, NetworkWorkerModules } from "./worker";

export type NetworkProcessorModules = NetworkWorkerModules &
  ValidatorFnsModules & {
    relayersConfig: Config;
    events: NetworkEventBus;
  };

export type NetworkProcessorOpts = {
  maxGossipTopicConcurrency?: number;
};

type WorkOpts = {
  bypassQueue?: boolean;
};

/**
 * True if we want to process gossip object immediately, false if we check for bls and regen
 * in order to process the gossip object.
 */
const executeGossipWorkOrderObj: Record<GossipType, WorkOpts> = {
  [GossipType.user_operations_with_entrypoint]: {},
};
const executeGossipWorkOrder = Object.keys(
  executeGossipWorkOrderObj
) as (keyof typeof executeGossipWorkOrderObj)[];

const MAX_JOBS_SUBMITTED_PER_TICK = 128;

export class NetworkProcessor {
  private readonly worker: NetworkWorker;
  private readonly events: NetworkEventBus;
  private readonly gossipQueues = createGossipQueues<PendingGossipsubMessage>();
  private readonly gossipTopicConcurrency = mapValues(
    this.gossipQueues,
    () => 0
  );

  constructor(
    modules: NetworkProcessorModules,
    private readonly opts: NetworkProcessorOpts
  ) {
    const { events } = modules;
    this.events = events;
    this.worker = new NetworkWorker(modules);

    events.on(
      NetworkEvent.pendingGossipsubMessage,
      this.onPendingGossipsubMessage.bind(this)
    );
  }

  async stop(): Promise<void> {
    this.events.off(
      NetworkEvent.pendingGossipsubMessage,
      this.onPendingGossipsubMessage
    );
  }

  dropAllJobs(): void {
    for (const topic of executeGossipWorkOrder) {
      this.gossipQueues[topic].clear();
    }
  }

  dumpGossipQueue(topic: GossipType): PendingGossipsubMessage[] {
    const queue = this.gossipQueues[topic];
    if (queue === undefined) {
      throw Error(
        `Unknown gossipType ${topic}, known values: ${Object.keys(
          this.gossipQueues
        ).join(", ")}`
      );
    }

    return queue.getAll();
  }

  private onPendingGossipsubMessage(message: PendingGossipsubMessage): void {
    this.pushPendingGossipsubMessageToQueue(message);
  }

  private pushPendingGossipsubMessageToQueue(
    message: PendingGossipsubMessage
  ): void {
    const topicType = message.topic.type;
    const droppedJob = this.gossipQueues[topicType].add(message);
    if (droppedJob) {
      // TODO: Should report the dropped job to gossip?
    }
    this.executeWork();
  }

  private executeWork(): void {
    let jobsSubmitted = 0;

    job_loop: while (jobsSubmitted < MAX_JOBS_SUBMITTED_PER_TICK) {
      for (const topic of executeGossipWorkOrder) {
        if (
          this.opts.maxGossipTopicConcurrency !== undefined &&
          this.gossipTopicConcurrency[topic] >
            this.opts.maxGossipTopicConcurrency
        ) {
          // Reached concurrency limit for topic, continue to next topic
          continue;
        }

        const item = this.gossipQueues[topic].next();
        if (item) {
          this.gossipTopicConcurrency[topic]++;
          this.worker
            .processPendingGossipsubMessage(item)
            .finally(() => this.gossipTopicConcurrency[topic]--)
            .catch((e: any) =>
              // eslint-disable-next-line no-console
              logger.error(e, "processGossipAttestations must not throw")
            );

          jobsSubmitted++;
          continue job_loop;
        }
      }

      // No item of work available on all queues, break off job_loop
      break;
    }
  }
}
