import { GossipSub, GossipsubEvents } from "@chainsafe/libp2p-gossipsub";
import logger, { Logger } from "api/lib/logger";
import { ts } from "types/lib";
import { deserializeMempoolId, networksConfig } from "params/lib";
import { GOSSIP_MAX_SIZE } from "types/lib/sszTypes";
import { AllChainsMetrics } from "monitoring/lib";
import { Libp2p } from "../interface";
import { NetworkEvent, NetworkEventBus } from "../events";
import {
  GossipTypeMap,
  GossipType,
  GossipTopic,
  GossipTopicMap,
} from "./interface";
import {
  GossipTopicCache,
  getGossipSSZType,
  stringifyGossipTopic,
} from "./topic";
import { DataTransformSnappy } from "./encoding";

export type GossipsubModules = {
  libp2p: Libp2p;
  events: NetworkEventBus;
  metrics: AllChainsMetrics | null;
};

export class BundlerGossipsub extends GossipSub {
  logger: Logger = logger;

  private readonly gossipTopicCache: GossipTopicCache;
  private readonly events: NetworkEventBus;
  private readonly monitoring: AllChainsMetrics | null; // name "metrics" is occupied by the base class

  constructor(modules: GossipsubModules) {
    const gossipTopicCache = new GossipTopicCache();
    super(
      {
        peerId: modules.libp2p.peerId,
        peerStore: modules.libp2p.peerStore,
        registrar: modules.libp2p.registrar as any,
        connectionManager: modules.libp2p.connectionManager as any,
      },
      {
        dataTransform: new DataTransformSnappy(
          gossipTopicCache,
          GOSSIP_MAX_SIZE
        ),
      }
    );
    this.gossipTopicCache = gossipTopicCache;
    this.events = modules.events;
    this.monitoring = modules.metrics;

    this.addEventListener(
      "gossipsub:message",
      this.onGossipsubMessage.bind(this)
    );
  }

  /**
   * Publish a `GossipObject` on a `GossipTopic`
   */
  async publishObject<K extends GossipType>(
    topic: GossipTopicMap[K],
    object: GossipTypeMap[K]
  ): Promise<number> {
    const topicStr = this.getGossipTopicString(topic);
    const sszType = getGossipSSZType(topic);
    const messageData = (
      sszType.serialize as unknown as (
        object: GossipTypeMap[GossipType]
      ) => Uint8Array
    )(object);
    const result = await this.publish(topicStr, messageData);
    const sentPeers = result.recipients.length;
    this.logger.debug({ topic: topicStr, sentPeers }, "Publish to topic");
    return sentPeers;
  }

  /**
   * Subscribe to a `GossipTopic`
   */
  subscribeTopic(topic: GossipTopic): void {
    const topicStr = this.getGossipTopicString(topic);
    // Register known topicStr
    this.gossipTopicCache.setTopic(topicStr, topic);

    this.logger.debug({ topic: topicStr }, "Subscribe to gossipsub topic");
    this.subscribe(topicStr);
  }

  /**
   * Unsubscribe to a `GossipTopic`
   */
  unsubscribeTopic(topic: GossipTopic): void {
    const topicStr = this.getGossipTopicString(topic);
    this.logger.debug({ topic: topicStr }, "Unsubscribe to gossipsub topic");
    this.unsubscribe(topicStr);
  }

  private getGossipTopicString(topic: GossipTopic): string {
    return stringifyGossipTopic(topic);
  }

  async publishUserOpsWithEntryPoint(
    userOpsWithEP: ts.UserOpsWithEntryPoint
  ): Promise<void> {
    const chainId = Number(userOpsWithEP.chain_id);
    if (!chainId || !networksConfig[chainId]) {
      logger.warn(`Unknown chainId ${userOpsWithEP.chain_id}. Skipping msg...`);
      return;
    }
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const networkConfig = networksConfig[chainId]!;
    const mempool = deserializeMempoolId(networkConfig.MEMPOOL_IDS[0]);
    await this.publishObject<GossipType.user_operations_with_entrypoint>(
      { type: GossipType.user_operations_with_entrypoint, mempool },
      userOpsWithEP
    );
  }

  private onGossipsubMessage(
    event: GossipsubEvents["gossipsub:message"]
  ): void {
    const { propagationSource, msgId, msg } = event.detail;

    try {
      // Also validates that the topicStr is known
      const topic = this.gossipTopicCache.getTopic(msg.topic);

      // Get seenTimestamp before adding the message to the queue or add async delays
      const seenTimestampSec = Date.now() / 1000;

      // Emit message to network processor, use setTimeout to yield to the macro queue
      // This is mostly due to too many attestation messages, and a gossipsub RPC may
      // contain multiple of them. This helps avoid the I/O lag issue.
      setTimeout(() => {
        this.events.emit(NetworkEvent.pendingGossipsubMessage as any, {
          topic,
          msg,
          msgId,
          propagationSource,
          seenTimestampSec,
          startProcessUnixSec: null,
        });
      }, 0);
    } catch (err) {
      this.logger.error(err);
    }
  }
}
