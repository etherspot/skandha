import { GossipSub, GossipsubEvents } from "@chainsafe/libp2p-gossipsub";
import logger, { Logger } from "api/lib/logger";
import { ts } from "types/lib";
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

export type GossipsubModules = {
  libp2p: Libp2p;
  events: NetworkEventBus;
};

export class BundlerGossipsub extends GossipSub {
  logger: Logger = logger;

  private readonly gossipTopicCache: GossipTopicCache;
  private readonly events: NetworkEventBus;

  constructor(modules: GossipsubModules) {
    super(
      {
        peerId: modules.libp2p.peerId,
        peerStore: modules.libp2p.peerStore,
        registrar: modules.libp2p.registrar,
        connectionManager: modules.libp2p.connectionManager as any,
      },
      {}
    );
    this.gossipTopicCache = new GossipTopicCache();
    this.events = modules.events;

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
    UserOpsWithEntryPoint: ts.UserOpsWithEntryPoint
  ): Promise<void> {
    const mempool = "test"; // TODO get mempool id from UserOpsWithEntryPoint.chain_id;
    await this.publishObject<GossipType.user_operations_with_entrypoint>(
      { type: GossipType.user_operations_with_entrypoint, mempool },
      UserOpsWithEntryPoint
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
