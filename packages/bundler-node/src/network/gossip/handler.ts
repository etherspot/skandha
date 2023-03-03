import {GossipSub, GossipsubEvents} from "@chainsafe/libp2p-gossipsub";
import {SignaturePolicy, TopicStr} from "@chainsafe/libp2p-gossipsub/types";
import {PeerScore, PeerScoreParams} from "@chainsafe/libp2p-gossipsub/score";
import { GossipTypeMap, GossipType, GossipEncoding, GossipTopic } from "./interface";

export class BundlerGossipsub extends GossipSub {
    config: any;
    logger: any;

    constructor() {
        super ();

    }

    /**
   * Publish a `GossipObject` on a `GossipTopic`
   */
  async publishObject<K extends GossipType>(topic: GossipTopicMap[K], object: GossipTypeMap[K]): Promise<number> {
    const topicStr = this.getGossipTopicString(topic);
    const sszType = getGossipSSZType(topic);
    const messageData = (sszType.serialize as (object: GossipTypeMap[GossipType]) => Uint8Array)(object);
    const result = await this.publish(topicStr, messageData);
    const sentPeers = result.recipients.length;
    this.logger.verbose("Publish to topic", {topic: topicStr, sentPeers});
    return sentPeers;
  }

  /**
   * Subscribe to a `GossipTopic`
   */
  subscribeTopic(topic: GossipTopic): void {
    const topicStr = this.getGossipTopicString(topic);
    // Register known topicStr
    this.gossipTopicCache.setTopic(topicStr, topic);

    this.logger.verbose("Subscribe to gossipsub topic", {topic: topicStr});
    this.subscribe(topicStr);
  }

  /**
   * Unsubscribe to a `GossipTopic`
   */
  unsubscribeTopic(topic: GossipTopic): void {
    const topicStr = this.getGossipTopicString(topic);
    this.logger.verbose("Unsubscribe to gossipsub topic", {topic: topicStr});
    this.unsubscribe(topicStr);
  }

  private getGossipTopicString(topic: GossipTopic): string {
    const encoding = topic.encoding ?? GossipEncoding.ssz_snappy;
    const mempool_id = this.config.mempool_id;
    return `/account_abstraction/${mempool_id}/${topic.type}/${encoding}`;
  }

  //TODO - impelementation of main topic functions

}