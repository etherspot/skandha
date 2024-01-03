export enum GoodByeReasonCode {
  CLIENT_SHUTDOWN = 1,
  IRRELEVANT_NETWORK = 2,
  ERROR = 3,
  TOO_MANY_PEERS = 129,
  SCORE_TOO_LOW = 250,
  BANNED = 251,
}

export const GOODBYE_KNOWN_CODES: Record<string, string> = {
  0: "Unknown",

  // spec-defined codes
  1: "Client shutdown",
  2: "Irrelevant network",
  3: "Internal fault/error",

  // Teku-defined codes
  128: "Unable to verify network",

  // Lighthouse-defined codes
  129: "Client has too many peers",
  250: "Peer score too low",
  251: "Peer banned this node",
};

/** Until js-libp2p types its events */
export enum Libp2pEvent {
  peerConnect = "peer:connect",
  peerDisconnect = "peer:disconnect",
}
