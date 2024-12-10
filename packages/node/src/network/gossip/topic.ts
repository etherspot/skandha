import { ssz } from "@skandha/types/lib";
import {
  GossipEncoding,
  GossipTopic,
  GossipTopicTypeMap,
  GossipType,
} from "./interface";
import { DEFAULT_ENCODING } from "./constants";

export interface IGossipTopicCache {
  getTopic(topicStr: string): GossipTopic;
}

export class GossipTopicCache implements IGossipTopicCache {
  private topicsByTopicStr = new Map<string, Required<GossipTopic>>();

  /** Returns cached GossipTopic, otherwise attempts to parse it from the str */
  getTopic(topicStr: string): GossipTopic {
    let topic = this.topicsByTopicStr.get(topicStr);
    if (topic === undefined) {
      topic = parseGossipTopic(topicStr);
      // TODO: Consider just throwing here. We should only receive messages from known subscribed topics
      this.topicsByTopicStr.set(topicStr, topic);
    }
    return topic;
  }

  /** Returns cached GossipTopic, otherwise returns undefined */
  getKnownTopic(topicStr: string): GossipTopic | undefined {
    return this.topicsByTopicStr.get(topicStr);
  }

  setTopic(topicStr: string, topic: GossipTopic): void {
    if (!this.topicsByTopicStr.has(topicStr)) {
      this.topicsByTopicStr.set(topicStr, {
        encoding: DEFAULT_ENCODING,
        ...topic,
      });
    }
  }
}

/**
 * Stringify a GossipTopic into a spec-ed formatted topic string
 */
export function stringifyGossipTopic(topic: GossipTopic): string {
  const topicType = stringifyGossipTopicType(topic);
  const encoding = topic.encoding ?? DEFAULT_ENCODING;
  return `/account_abstraction/${topic.mempool}/${topicType}/${encoding}`;
}

/**
 * Stringify a GossipTopic into a spec-ed formatted partial topic string
 */
function stringifyGossipTopicType(topic: GossipTopic): string {
  switch (topic.type) {
    case GossipType.user_operations:
      return topic.type;
  }
}

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export function getGossipSSZType(topic: GossipTopic) {
  switch (topic.type) {
    case GossipType.user_operations:
      return ssz.VerifiedUserOperation;
  }
}

// Parsing

const gossipTopicRegex = new RegExp(
  "^/account_abstraction/(\\w+)/(\\w+)/(\\w+)"
);

/**
 * Parse a `GossipTopic` object from its stringified form.
 * A gossip topic has the format
 * ```ts
 * /account_abstraction/$MEMPOOL_ID/$GOSSIP_TYPE/$ENCODING
 * ```
 */
export function parseGossipTopic(topicStr: string): Required<GossipTopic> {
  try {
    const matches = topicStr.match(gossipTopicRegex);
    if (matches === null) {
      throw Error(`Must match regex ${gossipTopicRegex}`);
    }

    const [, mempool, gossipTypeStr, encodingStr] = matches;

    const encoding = parseEncodingStr(encodingStr);

    // Inline-d the parseGossipTopicType() function since spreading the resulting object x4 the time to parse a topicStr
    switch (gossipTypeStr) {
      case GossipType.user_operations:
        return { type: gossipTypeStr, encoding, mempool };
    }

    throw Error(`Unknown gossip type ${gossipTypeStr}`);
  } catch (e) {
    (e as Error).message = `Invalid gossip topic ${topicStr}: ${
      (e as Error).message
    }`;
    throw e;
  }
}

export function getCoreTopics(): GossipTopicTypeMap[keyof GossipTopicTypeMap][] {
  // Common topics
  const topics: GossipTopicTypeMap[keyof GossipTopicTypeMap][] = [
    { type: GossipType.user_operations },
  ];

  return topics;
}

/**
 * Validate that a `encodingStr` is a known `GossipEncoding`
 */
function parseEncodingStr(encodingStr: string): GossipEncoding {
  switch (encodingStr) {
    case GossipEncoding.ssz_snappy:
      return encodingStr;

    default:
      throw Error(`Unknown encoding ${encodingStr}`);
  }
}
