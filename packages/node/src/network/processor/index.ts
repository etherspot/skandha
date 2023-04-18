import { MapDef, mapValues, sleep } from "utils/src";
import { ts } from "types/lib";
import { NetworkEvent, NetworkEventBus } from "../events";
import { GossipType } from "../gossip/interface";
import { createGossipQueues } from "./gossipQueues";
import { PendingGossipsubMessage } from "./types";
import { ValidatorFnsModules } from "./gossipHandlers";
import { NetworkWorker, NetworkWorkerModules } from "./worker";

export type NetworkProcessorModules = NetworkWorkerModules &
  ValidatorFnsModules & {
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

// TODO: Arbitrary constant, check metrics
const MAX_JOBS_SUBMITTED_PER_TICK = 128;

// How many attestations (aggregate + unaggregate) we keep before new ones get dropped.
const MAX_QUEUED_UNKNOWN_BLOCK_GOSSIP_OBJECTS = 16_384;

// We don't want to process too many attestations in a single tick
// As seen on mainnet, attestation concurrency metric ranges from 1000 to 2000
// so make this constant a little bit conservative
const MAX_UNKNOWN_BLOCK_GOSSIP_OBJECTS_PER_TICK = 1024;

// Same motivation to JobItemQueue, we don't want to block the event loop
const PROCESS_UNKNOWN_BLOCK_GOSSIP_OBJECTS_YIELD_EVERY_MS = 50;

/**
 * Network processor handles the gossip queues and throtles processing to not overload the main thread
 * - Decides when to process work and what to process
 *
 * What triggers execute work?
 *
 * - When work is submitted
 * - When downstream workers become available
 *
 * ### PendingGossipsubMessage beacon_attestation example
 *
 * For attestations, processing the message includes the steps:
 * 1. Pre shuffling sync validation
 * 2. Retrieve shuffling: async + goes into the regen queue and can be expensive
 * 3. Pre sig validation sync validation
 * 4. Validate BLS signature: async + goes into workers through another manager
 *
 * The gossip queues should receive "backpressue" from the regen and BLS workers queues.
 * Such that enough work is processed to fill either one of the queue.
 */
export class NetworkProcessor {
  private readonly worker: NetworkWorker;
  private readonly events: NetworkEventBus;
  private readonly gossipQueues = createGossipQueues<PendingGossipsubMessage>();
  private readonly gossipTopicConcurrency = mapValues(
    this.gossipQueues,
    () => 0
  );
  private readonly awaitingGossipsubMessagesByRootBySlot: MapDef<
    ts.Slot,
    MapDef<ts.RootHex, Set<PendingGossipsubMessage>>
  >;
  private unknownBlockGossipsubMessagesCount = 0;

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

    // this.chain.emitter.on(
    //   routes.events.EventType.block,
    //   this.onBlockProcessed.bind(this)
    // );
    // this.chain.emitter.on(ChainEvent.clockSlot, this.onClockSlot.bind(this));

    this.awaitingGossipsubMessagesByRootBySlot = new MapDef(
      () =>
        new MapDef<ts.RootHex, Set<PendingGossipsubMessage>>(() => new Set())
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
    // const extractBlockSlotRootFn =
    //   this.extractBlockSlotRootFns[message.topic.type];
    // if (extractBlockSlotRootFn) {
    //   const slotRoot = extractBlockSlotRootFn(message.msg.data);
    //   if (slotRoot && !this.chain.forkChoice.hasBlockHex(slotRoot.root)) {
    //     if (
    //       this.unknownBlockGossipsubMessagesCount >
    //       MAX_QUEUED_UNKNOWN_BLOCK_GOSSIP_OBJECTS
    //     ) {
    //       return;
    //     }

    //     const awaitingGossipsubMessagesByRoot =
    //       this.awaitingGossipsubMessagesByRootBySlot.getOrDefault(
    //         slotRoot.slot
    //       );
    //     const awaitingGossipsubMessages =
    //       awaitingGossipsubMessagesByRoot.getOrDefault(slotRoot.root);
    //     awaitingGossipsubMessages.add(message);
    //     this.unknownBlockGossipsubMessagesCount++;
    //   }
    // }

    // bypass the check for other messages
    this.pushPendingGossipsubMessageToQueue(message);
  }

  private pushPendingGossipsubMessageToQueue(
    message: PendingGossipsubMessage
  ): void {
    const topicType = message.topic.type;
    const droppedJob = this.gossipQueues[topicType].add(message);
    if (droppedJob) {
      // TODO: Should report the dropped job to gossip? It will be eventually pruned from the mcache
    }

    // Tentatively perform work
    this.executeWork();
  }

  private async onBlockProcessed({
    slot,
    block: rootHex,
  }: {
    slot: ts.Slot;
    block: string;
    executionOptimistic: boolean;
  }): Promise<void> {
    const byRootGossipsubMessages =
      this.awaitingGossipsubMessagesByRootBySlot.getOrDefault(slot);
    const waitingGossipsubMessages =
      byRootGossipsubMessages.getOrDefault(rootHex);
    if (waitingGossipsubMessages.size === 0) {
      return;
    }
    let count = 0;
    // TODO: we can group attestations to process in batches but since we have the SeenAttestationDatas
    // cache, it may not be necessary at this time
    for (const message of waitingGossipsubMessages) {
      this.pushPendingGossipsubMessageToQueue(message);
      count++;
      // don't want to block the event loop, worse case it'd wait for 16_084 / 1024 * 50ms = 800ms which is not a big deal
      if (count === MAX_UNKNOWN_BLOCK_GOSSIP_OBJECTS_PER_TICK) {
        count = 0;
        await sleep(PROCESS_UNKNOWN_BLOCK_GOSSIP_OBJECTS_YIELD_EVERY_MS);
      }
    }

    byRootGossipsubMessages.delete(rootHex);
  }

  private onClockSlot(clockSlot: ts.Slot): void {
    for (const [slot] of this.awaitingGossipsubMessagesByRootBySlot.entries()) {
      if (slot < clockSlot) {
        this.awaitingGossipsubMessagesByRootBySlot.delete(slot);
      }
    }
    this.unknownBlockGossipsubMessagesCount = 0;
  }

  private executeWork(): void {
    // TODO: Maybe de-bounce by timing the last time executeWork was run
    let jobsSubmitted = 0;

    job_loop: while (jobsSubmitted < MAX_JOBS_SUBMITTED_PER_TICK) {
      // Check canAcceptWork before calling queue.next() since it consumes the items
      const canAcceptWork = false;
      // this.chain.blsThreadPoolCanAcceptWork() &&
      // this.chain.regenCanAcceptWork();

      for (const topic of executeGossipWorkOrder) {
        // beacon block is guaranteed to be processed immedately
        if (!canAcceptWork) {
          break job_loop;
        }
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
              console.error("processGossipAttestations must not throw", {}, e)
            );

          jobsSubmitted++;
          // Attempt to find more work, but check canAcceptWork() again and run executeGossipWorkOrder priorization
          continue job_loop;
        }
      }

      // No item of work available on all queues, break off job_loop
      break;
    }
  }
}
